import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { podeAcessarPatrimonioHelpdesk } from "@/lib/permissoes";

/**
 * Autenticação por API key para os endpoints consumidos por máquinas (coletor).
 * Compara o header X-Api-Key com INV_COLETA_API_KEY.
 */
export function verificarApiKeyColeta(request: NextRequest) {
  const chaveConfig = process.env.INV_COLETA_API_KEY;
  if (!chaveConfig) {
    return {
      error: "Ingestão de coleta não configurada (defina INV_COLETA_API_KEY)",
      status: 503 as const,
    };
  }
  const chaveEnviada = request.headers.get("x-api-key");
  if (!chaveEnviada || chaveEnviada !== chaveConfig) {
    return { error: "API key inválida", status: 401 as const };
  }
  return { ok: true as const };
}

export const equipamentoListSelect = {
  id: true,
  tipo: true,
  hostname: true,
  nome: true,
  ip: true,
  mac: true,
  fabricante: true,
  modelo: true,
  numserie: true,
  statusRede: true,
  ultimoContato: true,
  ultimaColeta: true,
  metodoColeta: true,
  unidadeId: true,
  servidorId: true,
  itemId: true,
  unidade: { select: { id: true, nome: true } },
  servidor: { select: { id: true, nome: true } },
  item: { select: { idbem: true, patrimonio: true } },
  discos: { select: { tipoMidia: true, modeloFisico: true } },
} as const;

export const equipamentoDetalheSelect = {
  ...equipamentoListSelect,
  so: true,
  soVersao: true,
  soBuild: true,
  usuarioLogado: true,
  dominio: true,
  criadoEm: true,
  atualizadoEm: true,
  item: {
    select: {
      idbem: true,
      patrimonio: true,
      tipo: true,
      descsbpm: true,
      numserie: true,
      statusitem: true,
    },
  },
  hardware: true,
  discos: { orderBy: { id: "asc" } },
  softwares: { orderBy: { nome: "asc" } },
  historico: { orderBy: { criadoEm: "desc" }, take: 100 },
  localizacoes: { orderBy: { criadoEm: "desc" } },
  alertas: { orderBy: { criadoEm: "desc" }, where: { resolvido: false } },
} as const;

export async function exigeInventario() {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autorizado", status: 401 as const };
  }
  const permissao = (session as { usuario?: { permissao?: string } }).usuario
    ?.permissao;
  if (!podeAcessarPatrimonioHelpdesk(permissao ?? "")) {
    return { error: "Sem permissão", status: 403 as const };
  }
  return { ok: true as const };
}

/** Valida unidade/servidor/item quando presentes no payload. Retorna erro ou null. */
export async function validarRelacoes(
  data: Record<string, unknown>,
  equipamentoIdAtual?: number
): Promise<{ error: string } | null> {
  if (data.unidadeId) {
    const unidade = await prisma.hdUnidade.findFirst({
      where: { id: data.unidadeId as string, ativo: true },
    });
    if (!unidade) return { error: "Unidade não encontrada ou inativa" };
  }

  if (data.servidorId) {
    const servidor = await prisma.usuario.findFirst({
      where: { id: data.servidorId as string, status: true },
    });
    if (!servidor) return { error: "Servidor (responsável) não encontrado" };
  }

  if (data.itemId) {
    const item = await prisma.hdItemPatrimonio.findUnique({
      where: { idbem: data.itemId as number },
      select: { idbem: true, equipamento: { select: { id: true } } },
    });
    if (!item) return { error: "Item de patrimônio não encontrado" };
    if (item.equipamento && item.equipamento.id !== equipamentoIdAtual) {
      return { error: "Este item de patrimônio já está vinculado a outro equipamento" };
    }
  }

  return null;
}
