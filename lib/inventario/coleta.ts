import type { Prisma } from "@/prisma/generated";
import { prisma } from "@/lib/prisma";
import {
  METODOS_COLETA,
  TIPOS_EQUIPAMENTO,
  type MetodoColeta,
  type TipoEquipamento,
} from "./equipamento";

type Tx = Prisma.TransactionClient;

// --- Payload enviado pelo coletor (PowerShell/worker) ---

export type ColetaHardware = {
  cpuModelo?: string | null;
  cpuNucleos?: number | null;
  ramTotalMb?: number | null;
  placaMae?: string | null;
  bios?: string | null;
  placaVideo?: string | null;
};

export type ColetaDisco = {
  modelo?: string | null;
  tamanhoMb?: number | null;
  livreMb?: number | null;
  /** "SSD" | "HDD" | "Desconhecido" — mídia física do disco. */
  tipoMidia?: string | null;
  /** FriendlyName do disco físico (ex.: "Samsung SSD 970 EVO 500GB"). */
  modeloFisico?: string | null;
};

export type ColetaSoftware = {
  nome: string;
  fabricante?: string | null;
  versao?: string | null;
  caminho?: string | null;
};

export type ColetaPayload = {
  tipo?: string;
  hostname?: string | null;
  nome?: string | null;
  ip?: string | null;
  mac?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numserie?: string | null;
  so?: string | null;
  soVersao?: string | null;
  soBuild?: string | null;
  usuarioLogado?: string | null;
  dominio?: string | null;
  metodoColeta?: string;
  hardware?: ColetaHardware | null;
  discos?: ColetaDisco[] | null;
  softwares?: ColetaSoftware[] | null;
};

/** Nºs de série "lixo" reportados pela BIOS que não servem como identidade. */
const SERIAIS_INVALIDOS = new Set(
  [
    "",
    "to be filled by o.e.m.",
    "system serial number",
    "default string",
    "none",
    "not specified",
    "not available",
    "0",
    "1234567890",
    "o.e.m.",
  ].map((s) => s.toLowerCase())
);

function limpar(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function inteiroOuNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(v);
}

/** Normaliza MAC para AA:BB:CC:DD:EE:FF (facilita casar registros). */
export function normalizarMac(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const hex = v.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (hex.length !== 12) return limpar(v, 20);
  return hex.match(/.{2}/g)!.join(":");
}

function serieValida(numserie: string | null): boolean {
  if (!numserie) return false;
  return !SERIAIS_INVALIDOS.has(numserie.toLowerCase());
}

/** Valida e normaliza o payload cru vindo da requisição. */
export function parseColetaPayload(
  body: ColetaPayload
): { data?: ColetaPayload; error?: string } {
  const mac = normalizarMac(body.mac);
  const numserie = limpar(body.numserie, 200);
  const hostname = limpar(body.hostname, 200);

  // Precisa de ao menos uma âncora de identidade.
  if (!serieValida(numserie) && !mac && !hostname) {
    return {
      error:
        "Payload sem identidade: informe ao menos numserie, mac ou hostname válido",
    };
  }

  const tipo =
    typeof body.tipo === "string" && TIPOS_EQUIPAMENTO.includes(body.tipo as TipoEquipamento)
      ? (body.tipo as TipoEquipamento)
      : undefined;

  const metodoColeta =
    typeof body.metodoColeta === "string" &&
    METODOS_COLETA.includes(body.metodoColeta as MetodoColeta)
      ? (body.metodoColeta as MetodoColeta)
      : "winrm";

  return {
    data: {
      tipo,
      hostname,
      nome: limpar(body.nome, 200),
      ip: limpar(body.ip, 45),
      mac,
      fabricante: limpar(body.fabricante, 150),
      modelo: limpar(body.modelo, 200),
      numserie,
      so: limpar(body.so, 150),
      soVersao: limpar(body.soVersao, 80),
      soBuild: limpar(body.soBuild, 80),
      usuarioLogado: limpar(body.usuarioLogado, 150),
      dominio: limpar(body.dominio, 150),
      metodoColeta,
      hardware: body.hardware ?? null,
      discos: Array.isArray(body.discos) ? body.discos : null,
      softwares: Array.isArray(body.softwares) ? body.softwares : null,
    },
  };
}

// Campos escalares cujo diff vira registro em InvHistorico.
const CAMPOS_HISTORICO = [
  "hostname",
  "ip",
  "mac",
  "usuarioLogado",
  "so",
  "soVersao",
  "soBuild",
  "modelo",
  "fabricante",
] as const;

/** Localiza equipamento existente por série → mac → hostname (nessa ordem). */
async function localizarEquipamento(tx: Tx, p: ColetaPayload) {
  if (serieValida(p.numserie ?? null)) {
    const porSerie = await tx.invEquipamento.findFirst({
      where: { numserie: p.numserie },
    });
    if (porSerie) return porSerie;
  }
  if (p.mac) {
    const porMac = await tx.invEquipamento.findFirst({ where: { mac: p.mac } });
    if (porMac) return porMac;
  }
  if (p.hostname) {
    const porHost = await tx.invEquipamento.findFirst({
      where: { hostname: p.hostname },
    });
    if (porHost) return porHost;
  }
  return null;
}

export type ResultadoColeta = {
  equipamentoId: number;
  criado: boolean;
  mudancas: number;
  patrimonioVinculado: boolean;
};

/**
 * Ingesta uma coleta: cria ou atualiza o equipamento, registra o diff em
 * histórico, substitui hardware/discos/softwares e tenta vincular ao patrimônio.
 */
export async function ingerirColeta(
  payload: ColetaPayload
): Promise<ResultadoColeta> {
  const p = payload;
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    const existente = await localizarEquipamento(tx, p);

    const dadosEquipamento = {
      hostname: p.hostname ?? null,
      nome: p.nome ?? null,
      ip: p.ip ?? null,
      mac: p.mac ?? null,
      fabricante: p.fabricante ?? null,
      modelo: p.modelo ?? null,
      numserie: p.numserie ?? null,
      so: p.so ?? null,
      soVersao: p.soVersao ?? null,
      soBuild: p.soBuild ?? null,
      usuarioLogado: p.usuarioLogado ?? null,
      dominio: p.dominio ?? null,
      statusRede: "online" as const,
      ultimoContato: agora,
      ultimaColeta: agora,
      metodoColeta: p.metodoColeta as MetodoColeta,
    };

    let equipamentoId: number;
    let criado = false;
    let mudancas = 0;

    if (!existente) {
      const novo = await tx.invEquipamento.create({
        data: {
          ...dadosEquipamento,
          tipo: (p.tipo as TipoEquipamento) ?? "desktop",
        },
        select: { id: true },
      });
      equipamentoId = novo.id;
      criado = true;
    } else {
      equipamentoId = existente.id;

      // Diff dos campos escalares → histórico (nunca apaga).
      const registros: {
        campo: string;
        valorAnterior: string | null;
        valorNovo: string | null;
      }[] = [];
      for (const campo of CAMPOS_HISTORICO) {
        const anterior = (existente as Record<string, unknown>)[campo] ?? null;
        const novo = (dadosEquipamento as Record<string, unknown>)[campo] ?? null;
        // Só registra quando há valor novo e ele difere do anterior.
        if (novo !== null && String(anterior ?? "") !== String(novo)) {
          registros.push({
            campo,
            valorAnterior: anterior === null ? null : String(anterior),
            valorNovo: String(novo),
          });
        }
      }

      await tx.invEquipamento.update({
        where: { id: equipamentoId },
        // tipo só muda se o coletor informou explicitamente.
        data: p.tipo ? { ...dadosEquipamento, tipo: p.tipo as TipoEquipamento } : dadosEquipamento,
      });

      if (registros.length > 0) {
        await tx.invHistorico.createMany({
          data: registros.map((r) => ({
            equipamentoId,
            campo: r.campo,
            valorAnterior: r.valorAnterior,
            valorNovo: r.valorNovo,
            origem: p.metodoColeta as MetodoColeta,
          })),
        });
        mudancas += registros.length;
      }
    }

    // Hardware (1:1) — registra upgrade de RAM no histórico.
    if (p.hardware) {
      const hwAnterior = existente
        ? await tx.invHardware.findUnique({ where: { equipamentoId } })
        : null;
      const ramNova = inteiroOuNull(p.hardware.ramTotalMb);
      if (
        hwAnterior &&
        ramNova !== null &&
        hwAnterior.ramTotalMb !== null &&
        hwAnterior.ramTotalMb !== ramNova
      ) {
        await tx.invHistorico.create({
          data: {
            equipamentoId,
            campo: "ram",
            valorAnterior: String(hwAnterior.ramTotalMb),
            valorNovo: String(ramNova),
            origem: p.metodoColeta as MetodoColeta,
          },
        });
        mudancas += 1;
      }

      await tx.invHardware.upsert({
        where: { equipamentoId },
        create: {
          equipamentoId,
          cpuModelo: limpar(p.hardware.cpuModelo, 200),
          cpuNucleos: inteiroOuNull(p.hardware.cpuNucleos),
          ramTotalMb: ramNova,
          placaMae: limpar(p.hardware.placaMae, 200),
          bios: limpar(p.hardware.bios, 200),
          placaVideo: limpar(p.hardware.placaVideo, 200),
        },
        update: {
          cpuModelo: limpar(p.hardware.cpuModelo, 200),
          cpuNucleos: inteiroOuNull(p.hardware.cpuNucleos),
          ramTotalMb: ramNova,
          placaMae: limpar(p.hardware.placaMae, 200),
          bios: limpar(p.hardware.bios, 200),
          placaVideo: limpar(p.hardware.placaVideo, 200),
        },
      });
    }

    // Discos — snapshot completo (substitui).
    if (p.discos) {
      await tx.invDisco.deleteMany({ where: { equipamentoId } });
      if (p.discos.length > 0) {
        await tx.invDisco.createMany({
          data: p.discos.map((d) => ({
            equipamentoId,
            modelo: limpar(d.modelo, 200),
            tamanhoMb: inteiroOuNull(d.tamanhoMb),
            livreMb: inteiroOuNull(d.livreMb),
            tipoMidia: limpar(d.tipoMidia, 20),
            modeloFisico: limpar(d.modeloFisico, 200),
          })),
        });
      }
    }

    // Softwares — snapshot completo (substitui).
    if (p.softwares) {
      await tx.invSoftware.deleteMany({ where: { equipamentoId } });
      const validos = p.softwares
        .map((s) => ({
          equipamentoId,
          nome: limpar(s.nome, 300),
          fabricante: limpar(s.fabricante, 200),
          versao: limpar(s.versao, 80),
          caminho: limpar(s.caminho, 500),
        }))
        .filter((s): s is typeof s & { nome: string } => s.nome !== null);
      if (validos.length > 0) {
        await tx.invSoftware.createMany({ data: validos });
      }
    }

    // Vínculo automático ao patrimônio por nº de série (se ainda não vinculado).
    let patrimonioVinculado = false;
    const equipamentoAtual = await tx.invEquipamento.findUnique({
      where: { id: equipamentoId },
      select: { itemId: true },
    });
    if (!equipamentoAtual?.itemId && serieValida(p.numserie ?? null)) {
      const candidatos = await tx.hdItemPatrimonio.findMany({
        where: {
          excluido: false,
          numserie: p.numserie,
          equipamento: { is: null },
        },
        select: { idbem: true },
        take: 2,
      });
      if (candidatos.length === 1) {
        await tx.invEquipamento.update({
          where: { id: equipamentoId },
          data: { itemId: candidatos[0].idbem },
        });
        patrimonioVinculado = true;
      }
    }

    return { equipamentoId, criado, mudancas, patrimonioVinculado };
  });
}
