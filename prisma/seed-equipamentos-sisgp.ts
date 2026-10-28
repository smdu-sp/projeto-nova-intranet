/**
 * Povoa hd.itens_patrimonio + inv.equipamentos (vinculados) a partir dos computadores
 * reais da tabela `item` do SISGP (SISGP_DATABASE_URL). Escopo: só tipos de computador
 * (MICROCOMPUTADOR, NOTEBOOK, COMPUTADOR, WORKSTATION, MICROCOMPUTADOR WORKSTATION, SERVIDOR).
 * Itens descartados/para descarte entram com o statusitem real (aparecem como inativos).
 * Uso: npx tsx prisma/seed-equipamentos-sisgp.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, type InvTipoEquipamento } from "./generated";
import { poolSisgpDisponivel, querySisgp } from "../lib/sisgp/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : undefined,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});
const prisma = new PrismaClient({ adapter });

/** Tipos da SISGP tratados como "computador" neste seed. */
const TIPOS_COMPUTADOR = [
  "MICROCOMPUTADOR",
  "NOTEBOOK",
  "COMPUTADOR",
  "WORKSTATION",
  "MICROCOMPUTADOR WORKSTATION",
  "SERVIDOR",
];

const MAPA_TIPO_INV: Record<string, InvTipoEquipamento> = {
  MICROCOMPUTADOR: "desktop",
  COMPUTADOR: "desktop",
  WORKSTATION: "desktop",
  "MICROCOMPUTADOR WORKSTATION": "desktop",
  NOTEBOOK: "notebook",
  SERVIDOR: "servidor",
};

type LinhaItemSisgp = {
  idbem: number;
  patrimonio: string | null;
  tipo: string | null;
  descsbpm: string | null;
  numserie: string | null;
  tiposbpm: string | null;
  marca: string | null;
  modelo: string | null;
  localizacao: string | null;
  servidor: string | null;
  numprocesso: string | null;
  cimbpm: string | null;
  nome: string | null;
  statusitem: string | null;
};

function nullStr(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const s = valor.replace(/[\r\n]/g, "").trim();
  return s === "" ? null : s;
}

async function buscarItensComputadorSgu(): Promise<LinhaItemSisgp[]> {
  const placeholders = TIPOS_COMPUTADOR.map(() => "?").join(",");
  return querySisgp<LinhaItemSisgp>(
    `SELECT idbem, patrimonio, tipo, descsbpm, numserie, tiposbpm, marca, modelo,
            localizacao, servidor, numprocesso, cimbpm, nome, statusitem
     FROM item
     WHERE excluido = 0 AND TRIM(tipo) IN (${placeholders})`,
    TIPOS_COMPUTADOR
  );
}

async function main() {
  if (!poolSisgpDisponivel()) {
    throw new Error("SISGP_DATABASE_URL não configurado — não é possível ler a tabela item.");
  }

  const itens = await buscarItensComputadorSgu();
  if (itens.length === 0) {
    throw new Error("Nenhum computador retornado do SISGP (verifique a conexão e a tabela item).");
  }

  const unidades = await prisma.hdUnidade.findMany({ select: { id: true, sigla: true } });
  const unidadePorSiglaUpper = new Map<string, string>();
  for (const u of unidades) unidadePorSiglaUpper.set(u.sigla.toUpperCase(), u.id);

  const usuarios = await prisma.usuario.findMany({ select: { id: true, nome: true } });
  const usuarioPorNomeUpper = new Map<string, string>();
  for (const u of usuarios) usuarioPorNomeUpper.set(u.nome.toUpperCase(), u.id);

  function resolverUnidade(localizacao: string | null): string | undefined {
    if (!localizacao) return undefined;
    const upper = localizacao.toUpperCase();
    if (unidadePorSiglaUpper.has(upper)) return unidadePorSiglaUpper.get(upper);
    const primeiraPalavra = upper.split(/\s+/)[0];
    return unidadePorSiglaUpper.get(primeiraPalavra);
  }

  function resolverServidor(nomeServidor: string | null): string | undefined {
    if (!nomeServidor) return undefined;
    return usuarioPorNomeUpper.get(nomeServidor.toUpperCase());
  }

  let patrimonioCriados = 0;
  let patrimonioAtualizados = 0;
  let equipamentoCriados = 0;
  let equipamentoAtualizados = 0;
  let semUnidade = 0;
  let semServidor = 0;
  const erros: string[] = [];

  for (const row of itens) {
    const tipoOriginal = nullStr(row.tipo) ?? "";
    const tipoNormalizado = tipoOriginal.toUpperCase();
    const unidadeId = resolverUnidade(row.localizacao);
    const servidorId = resolverServidor(row.servidor);
    if (!unidadeId) semUnidade++;
    if (!servidorId) semServidor++;

    try {
      const existente = await prisma.hdItemPatrimonio.findUnique({
        where: { idbem: row.idbem },
        select: { idbem: true },
      });

      await prisma.hdItemPatrimonio.upsert({
        where: { idbem: row.idbem },
        create: {
          idbem: row.idbem,
          patrimonio: nullStr(row.patrimonio),
          tipo: tipoOriginal || null,
          descsbpm: nullStr(row.descsbpm),
          numserie: nullStr(row.numserie),
          tiposbpm: nullStr(row.tiposbpm),
          marca: nullStr(row.marca),
          modelo: nullStr(row.modelo),
          localizacao: nullStr(row.localizacao),
          numprocesso: nullStr(row.numprocesso),
          cimbpm: nullStr(row.cimbpm),
          nomeRede: nullStr(row.nome),
          statusitem: nullStr(row.statusitem) ?? "Ativo",
          unidadeId,
          servidorId,
        },
        update: {
          patrimonio: nullStr(row.patrimonio),
          tipo: tipoOriginal || null,
          descsbpm: nullStr(row.descsbpm),
          numserie: nullStr(row.numserie),
          tiposbpm: nullStr(row.tiposbpm),
          marca: nullStr(row.marca),
          modelo: nullStr(row.modelo),
          localizacao: nullStr(row.localizacao),
          numprocesso: nullStr(row.numprocesso),
          cimbpm: nullStr(row.cimbpm),
          nomeRede: nullStr(row.nome),
          statusitem: nullStr(row.statusitem) ?? "Ativo",
          ...(unidadeId ? { unidadeId } : {}),
          ...(servidorId ? { servidorId } : {}),
        },
      });
      if (existente) patrimonioAtualizados++;
      else patrimonioCriados++;

      const tipoInv = MAPA_TIPO_INV[tipoNormalizado] ?? "outro";
      const equipamentoExistente = await prisma.invEquipamento.findUnique({
        where: { itemId: row.idbem },
        select: { id: true },
      });

      await prisma.invEquipamento.upsert({
        where: { itemId: row.idbem },
        create: {
          itemId: row.idbem,
          tipo: tipoInv,
          hostname: nullStr(row.nome),
          nome: nullStr(row.nome),
          fabricante: nullStr(row.marca),
          modelo: nullStr(row.modelo),
          numserie: nullStr(row.numserie),
          metodoColeta: "import",
          unidadeId,
          servidorId,
        },
        update: {
          tipo: tipoInv,
          hostname: nullStr(row.nome),
          nome: nullStr(row.nome),
          fabricante: nullStr(row.marca),
          modelo: nullStr(row.modelo),
          numserie: nullStr(row.numserie),
          ...(unidadeId ? { unidadeId } : {}),
          ...(servidorId ? { servidorId } : {}),
        },
      });
      if (equipamentoExistente) equipamentoAtualizados++;
      else equipamentoCriados++;
    } catch (e) {
      erros.push(`idbem ${row.idbem}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `Patrimônio: ${itens.length} computadores (${patrimonioCriados} novos, ${patrimonioAtualizados} atualizados).`
  );
  console.log(
    `Inventário de TI: ${equipamentoCriados} novos, ${equipamentoAtualizados} atualizados.`
  );
  console.log(`Sem unidade resolvida: ${semUnidade}. Sem servidor (usuário) resolvido: ${semServidor}.`);
  if (erros.length > 0) {
    console.log(`Erros (${erros.length}):`);
    for (const e of erros.slice(0, 20)) console.log(" -", e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
