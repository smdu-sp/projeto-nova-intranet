import { prisma } from "@/lib/prisma";
import {
  chamadoInclude,
  collectUserIdsFromChamados,
  mapChamadoApi,
} from "@/lib/helpdesk/mappers";
import { textoAbertura } from "@/lib/helpdesk/eventos";
import { buildUserIdMaps } from "@/lib/helpdesk/mappers";
import { buscarResponsavelUnidadeSgu } from "@/lib/sgu/responsaveis";
import { enviarEmailAutorizacaoAcesso } from "./email-solicitacao";
import { resolverCoordenadoriaPorUnidade } from "./coordenadoria-unidade";
import { pontoFocalDaUnidade } from "./ponto-focal";
import type { HdPrioridade } from "@/prisma/generated";

export type CriarSolicitacaoAcessoInput = {
  paraSiMesmo: boolean;
  nomeBeneficiario: string;
  rfBeneficiario: string;
  beneficiarioUsuarioId?: string | null;
  sistemaId: number;
  permissaoId: number;
  unidadeId: string;
  observacao?: string;
  prioridade?: string;
};

export async function criarSolicitacaoAcesso(params: {
  autorId: string;
  autorNome: string;
  autorLogin: string;
  input: CriarSolicitacaoAcessoInput;
  baseUrl: string;
  isStaff: boolean;
}) {
  const { autorId, autorNome, autorLogin, input, baseUrl, isStaff } = params;

  const ehPontoFocal = await pontoFocalDaUnidade(autorId, input.unidadeId);
  if (!ehPontoFocal && !isStaff) {
    throw new Error("Somente o ponto focal da unidade pode abrir solicitações de acesso");
  }

  if (!input.paraSiMesmo && input.beneficiarioUsuarioId && !isStaff) {
    const [autor, beneficiario] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: autorId }, select: { coordenadoriaId: true } }),
      prisma.usuario.findUnique({
        where: { id: input.beneficiarioUsuarioId },
        select: { coordenadoriaId: true },
      }),
    ]);
    if (
      autor?.coordenadoriaId &&
      beneficiario?.coordenadoriaId &&
      autor.coordenadoriaId !== beneficiario.coordenadoriaId
    ) {
      throw new Error(
        "O beneficiário precisa ser um servidor da mesma coordenadoria do ponto focal"
      );
    }
  }

  const [unidade, sistema, permissao] = await Promise.all([
    prisma.hdUnidade.findFirst({ where: { id: input.unidadeId, ativo: true } }),
    prisma.hdSistemaAcesso.findFirst({ where: { id: input.sistemaId, ativo: true } }),
    prisma.hdSistemaPermissao.findFirst({
      where: { id: input.permissaoId, ativo: true, sistemaId: input.sistemaId },
    }),
  ]);

  if (!unidade) throw new Error("Unidade não encontrada");
  if (!sistema) throw new Error("Sistema não encontrado");
  if (!permissao) throw new Error("Tipo de permissão inválido");

  const coordenadoria = await resolverCoordenadoriaPorUnidade(unidade.id);
  const responsavelSgu = await buscarResponsavelUnidadeSgu({
    siglaUnidade: unidade.sigla,
    nomeUnidade: unidade.nome,
    raizCoordenadoria: unidade.raiz,
  });

  let responsavelLocalId: string | null = null;
  if (responsavelSgu?.login) {
    const local = await prisma.usuario.findFirst({
      where: { login: responsavelSgu.login, status: true },
      select: { id: true, email: true, nome: true },
    });
    responsavelLocalId = local?.id ?? null;
    if (local?.email) responsavelSgu.email = local.email;
    if (local?.nome) responsavelSgu.nome = local.nome;
  }

  const titulo = `Acesso ${sistema.nome} — ${input.nomeBeneficiario} (RF ${input.rfBeneficiario})`;
  const descricao = [
    `Solicitação de acesso a sistema`,
    `Beneficiário: ${input.nomeBeneficiario}`,
    `RF: ${input.rfBeneficiario}`,
    `Sistema: ${sistema.nome}`,
    `Permissão: ${permissao.nome}`,
    `Unidade: ${unidade.nome}`,
    coordenadoria ? `Coordenadoria: ${coordenadoria.nome}` : null,
    input.observacao?.trim() ? `Observação: ${input.observacao.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prioridade = (["baixa", "media", "alta", "urgente"].includes(input.prioridade ?? "")
    ? input.prioridade
    : "media") as HdPrioridade;

  const categoria = await prisma.hdCategoria.findFirst({
    where: { ativo: true, pai: { contains: "Liberação" } },
  });
  const categoriaId =
    categoria?.id ??
    (await prisma.hdCategoria.findFirst({ where: { ativo: true } }))?.id;
  if (!categoriaId) throw new Error("Nenhuma categoria cadastrada no help desk");

  const observadorIds = new Set<string>([autorId]);
  if (responsavelLocalId) observadorIds.add(responsavelLocalId);

  const beneficiarioUuid = input.beneficiarioUsuarioId || null;
  const solicitanteId = beneficiarioUuid && !input.paraSiMesmo ? beneficiarioUuid : autorId;

  const criado = await prisma.$transaction(async (tx) => {
    const chamado = await tx.hdChamado.create({
      data: {
        titulo: titulo.slice(0, 300),
        descricao,
        prioridade,
        status: "aguardando_autorizacao",
        solicitanteId,
        abertoEmNomeDeId: input.paraSiMesmo ? null : autorId,
        unidadeId: unidade.id,
        categoriaId,
        areaOrigem: "acesso_sistemas",
        areaAtual: "acesso_sistemas",
      },
    });

    await tx.hdChamadoEvento.create({
      data: {
        chamadoId: chamado.id,
        tipo: "abertura",
        autorId,
        texto: textoAbertura(autorNome),
      },
    });

    for (const obsId of observadorIds) {
      if (obsId === solicitanteId) continue;
      await tx.hdChamadoUsuario.create({
        data: { chamadoId: chamado.id, usuarioId: obsId, papel: "observador" },
      });
    }

    const solicitacao = await tx.hdSolicitacaoAcesso.create({
      data: {
        chamadoId: chamado.id,
        nomeBeneficiario: input.nomeBeneficiario.trim(),
        rfBeneficiario: input.rfBeneficiario.trim(),
        sistemaId: sistema.id,
        permissaoId: permissao.id,
        unidadeId: unidade.id,
        coordenadoriaId: coordenadoria?.id ?? null,
        observacao: input.observacao?.trim() || null,
        paraSiMesmo: input.paraSiMesmo,
        beneficiarioUsuarioId: beneficiarioUuid,
        responsavelAutorizacaoId: responsavelLocalId,
        responsavelAutorizacaoNome: responsavelSgu?.nome ?? null,
        responsavelAutorizacaoEmail: responsavelSgu?.email ?? null,
      },
    });

    await tx.hdMensagem.create({
      data: {
        chamadoId: chamado.id,
        autorId: solicitanteId,
        texto: descricao,
        tipo: "publica",
      },
    });

    return { chamadoId: chamado.id, solicitacaoId: solicitacao.id };
  });

  const emailDestino = responsavelSgu?.email;
  if (emailDestino) {
    const enviado = await enviarEmailAutorizacaoAcesso(emailDestino, {
      chamadoId: criado.chamadoId,
      nomeBeneficiario: input.nomeBeneficiario,
      rfBeneficiario: input.rfBeneficiario,
      sistema: sistema.nome,
      tipoPermissao: permissao.nome,
      unidade: unidade.nome,
      coordenadoria: coordenadoria?.nome ?? "",
      observacao: input.observacao ?? null,
      pontoFocalNome: autorNome,
      pontoFocalRf: autorLogin,
      linkNegar: `${baseUrl}/helpdesk/chamados/acesso-sistemas/autorizacoes?chamado=${criado.chamadoId}`,
    });
    if (enviado) {
      await prisma.hdSolicitacaoAcesso.update({
        where: { id: criado.solicitacaoId },
        data: { emailEnviadoEm: new Date() },
      });
    }
  }

  const completo = await prisma.hdChamado.findUnique({
    where: { id: criado.chamadoId },
    include: chamadoInclude,
  });
  if (!completo) throw new Error("Chamado criado mas não encontrado");

  const ids = collectUserIdsFromChamados([completo]);
  const { uuidToNum } = buildUserIdMaps(ids);

  return mapChamadoApi(completo, uuidToNum, true);
}
