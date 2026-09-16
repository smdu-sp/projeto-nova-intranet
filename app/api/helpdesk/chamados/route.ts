import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildUserIdMaps,
  chamadoInclude,
  collectUserIdsFromChamados,
  mapChamadoApi,
  mapUsuarioApi,
} from "@/lib/helpdesk/mappers";
import { textoAbertura, textoFechamentoAutomatico } from "@/lib/helpdesk/eventos";
import { processarAutorizacoesPendentesExpiradas } from "@/lib/helpdesk/acesso-sistemas/autorizar-solicitacao";
import {
  montarMensagemInicialChamado,
  nomeMaquinaItemPatrimonio,
} from "@/lib/helpdesk/mensagem-inicial";
import { getSessaoHelpdesk } from "@/lib/helpdesk/session";
import {
  getCapacidadesHelpdesk,
  podeAbrirChamadosHelpdesk,
  podeSelecionarItemEmChamado,
} from "@/lib/permissoes";
import {
  exigeComputadorNaAbertura,
  isTipoChamado,
  type TipoChamado,
} from "@/lib/helpdesk/tipos-chamado";
import type { HdPrioridade, HdTipoChamado } from "@/prisma/generated";

const PRIORIDADES = new Set(["baixa", "media", "alta", "urgente"]);

export async function GET() {
  try {
    const sessao = await getSessaoHelpdesk();
    if ("error" in sessao) {
      return NextResponse.json({ error: sessao.error }, { status: sessao.status });
    }

    const { usuario, perfil, isStaff } = sessao;
    const capacidades = getCapacidadesHelpdesk(usuario.permissao);

    if (
      !capacidades.abrirChamados &&
      !capacidades.atenderChamados &&
      !capacidades.patrimonio
    ) {
      return NextResponse.json(
        { error: "Sem permissão para o módulo Help Desk" },
        { status: 403 }
      );
    }

    await processarAutorizacoesPendentesExpiradas();

    const limiteSemRetorno = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const resolvidosExpirados = await prisma.hdChamado.findMany({
      where: {
        status: "resolvido",
        dataResolucao: { lte: limiteSemRetorno },
      },
      select: {
        id: true,
        solicitanteId: true,
      },
    });

    if (resolvidosExpirados.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const chamado of resolvidosExpirados) {
          await tx.hdChamado.updateMany({
            where: { id: chamado.id, status: "resolvido" },
            data: {
              status: "fechado",
              dataFechamento: new Date(),
            },
          });
          await tx.hdChamadoEvento.create({
            data: {
              chamadoId: chamado.id,
              tipo: "fechamento",
              autorId: chamado.solicitanteId,
              texto: textoFechamentoAutomatico(),
            },
          });
        }
      });
    }

    const incluirChamados =
      capacidades.atenderChamados || capacidades.abrirChamados;

    const whereChamados = isStaff
      ? {}
      : {
          OR: [
            { solicitanteId: usuario.id },
            { abertoEmNomeDeId: usuario.id },
            { usuarios: { some: { usuarioId: usuario.id } } },
          ],
        };

    const carregarItens = podeSelecionarItemEmChamado(usuario.permissao) ||
      capacidades.patrimonio;

    const [dbChamados, todosUsuariosDb, dbUnidades, dbCategorias, dbItens, dbTransferencias, dbBaixas, dbStatusHistorico] =
      await Promise.all([
        incluirChamados
          ? prisma.hdChamado.findMany({
              where: whereChamados,
              include: chamadoInclude,
              orderBy: { abertura: "desc" },
              take: 500,
            })
          : Promise.resolve([]),
        prisma.usuario.findMany({
          where: { status: true },
          select: {
            id: true,
            login: true,
            nome: true,
            permissao: true,
            email: true,
            telefone: true,
            status: true,
          },
        }),
        prisma.hdUnidade.findMany({
          where: { ativo: true },
          orderBy: { nome: "asc" },
        }),
        prisma.hdCategoria.findMany({
          where: { ativo: true },
          orderBy: [{ pai: "asc" }, { filho: "asc" }],
        }),
        carregarItens
          ? prisma.hdItemPatrimonio.findMany({
              where: capacidades.patrimonio ? {} : { statusitem: "Ativo" },
              include: { unidade: true, servidor: true },
              orderBy: { patrimonio: "asc" },
              take: 2000,
            })
          : Promise.resolve([]),
        capacidades.patrimonio
          ? prisma.hdTransferenciaCabecalho.findMany({
              include: {
                itens: {
                  include: {
                    item: { select: { patrimonio: true, descsbpm: true } },
                  },
                },
                unidadeDestino: true,
              },
              orderBy: { dataTransferencia: "desc" },
              take: 500,
            })
          : Promise.resolve([]),
        capacidades.patrimonio
          ? prisma.hdBaixaPatrimonio.findMany({
              include: {
                item: { select: { patrimonio: true, descsbpm: true } },
                usuarioBaixa: { select: { id: true, nome: true } },
              },
              orderBy: { dataBaixa: "desc" },
              take: 500,
            })
          : Promise.resolve([]),
        capacidades.patrimonio
          ? prisma.hdItemPatrimonioStatusHistorico.findMany({
              include: {
                item: { select: { patrimonio: true, descsbpm: true } },
                usuario: { select: { id: true, nome: true } },
              },
              orderBy: { criadoEm: "desc" },
              take: 2000,
            })
          : Promise.resolve([]),
      ]);

    const userUuidSet = new Set(todosUsuariosDb.map((u) => u.id));
    collectUserIdsFromChamados(dbChamados).forEach((id) => userUuidSet.add(id));
    dbItens.forEach((i) => {
      if (i.servidorId) userUuidSet.add(i.servidorId);
    });
    dbTransferencias.forEach((t) => userUuidSet.add(t.idUsuarioRegistro));
    dbBaixas.forEach((b) => userUuidSet.add(b.idUsuarioBaixa));
    dbStatusHistorico.forEach((h) => userUuidSet.add(h.idUsuario));

    const { uuidToNum, numToUuid } = buildUserIdMaps(userUuidSet);

    const userMap = new Map(todosUsuariosDb.map((u) => [u.id, u]));
    for (const c of dbChamados) {
      userMap.set(c.solicitante.id, c.solicitante);
      if (c.abertoEmNomeDe) userMap.set(c.abertoEmNomeDe.id, c.abertoEmNomeDe);
      c.usuarios.forEach((cu) => userMap.set(cu.usuario.id, cu.usuario));
      c.eventos.forEach((e) => userMap.set(e.autor.id, e.autor));
      c.mensagens.forEach((m) => userMap.set(m.autor.id, m.autor));
    }

    const usuarios = [...userMap.values()].map((u) => mapUsuarioApi(u, uuidToNum));
    const chamados = dbChamados.map((c) => mapChamadoApi(c, uuidToNum, isStaff));
    const usuarioLogadoId = uuidToNum.get(usuario.id) ?? null;

    const unidades = dbUnidades.map((u) => ({
      id: u.id,
      full: u.nome,
      raiz: u.raiz,
      sigla: u.sigla,
      codigo: u.codigo,
      sala: u.sala ?? undefined,
    }));

    const categorias = dbCategorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      pai: c.pai,
      filho: c.filho,
      area: c.area,
      full: c.filho ? `${c.pai} > ${c.filho}` : c.pai,
    }));

    const categoriasPai = [...new Set(categorias.map((c) => c.pai))].sort();

    const itens = dbItens.map((i) => ({
      idbem: i.idbem,
      patrimonio: i.patrimonio,
      tipo: i.tipo,
      descsbpm: i.descsbpm,
      numserie: i.numserie ?? "",
      marca: i.marca ?? "",
      modelo: i.modelo ?? "",
      localizacao: i.unidade?.sigla ?? i.unidade?.nome ?? "—",
      unidadeId: i.unidadeId,
      servidor: i.servidor?.nome ?? "—",
      servidorId: i.servidorId ? (uuidToNum.get(i.servidorId) ?? null) : null,
      cimbpm: i.cimbpm ?? "",
      nomeRede: i.nomeRede ?? undefined,
      statusitem: i.statusitem,
    }));

    const baixas = dbBaixas.map((b) => ({
      id: b.id,
      idItem: b.idItem,
      patrimonio: b.item.patrimonio ?? "",
      descricao: b.item.descsbpm ?? "",
      dataBaixa: b.dataBaixa.toISOString(),
      idUsuarioBaixa: uuidToNum.get(b.idUsuarioBaixa) ?? 0,
      usuarioBaixa: b.usuarioBaixa.nome,
      documentoSbpm: b.documentoSbpm,
      observacao: b.observacao ?? "",
    }));

    const statusHistorico = dbStatusHistorico.map((h) => ({
      id: h.id,
      idItem: h.idItem,
      patrimonio: h.item.patrimonio ?? "",
      descricao: h.item.descsbpm ?? "",
      statusAnterior: h.statusAnterior ?? "",
      statusNovo: h.statusNovo,
      motivo: h.motivo,
      idUsuario: uuidToNum.get(h.idUsuario) ?? 0,
      usuario: h.usuario.nome,
      criadoEm: h.criadoEm.toISOString(),
    }));

    const transferencias = dbTransferencias.map((t) => ({
      id: t.id,
      cimbpm: t.cimbpm,
      observacao: t.observacao ?? "",
      dataTransferencia: t.dataTransferencia.toISOString(),
      idUsuarioRegistro: uuidToNum.get(t.idUsuarioRegistro) ?? 0,
      idUnidadeDestino: t.idUnidadeDestino,
      unidadeDestino: t.unidadeDestino.sigla ?? t.unidadeDestino.nome,
      itens: t.itens.map((i) => ({
        id: i.id,
        idItem: i.idItem,
        patrimonio: i.item.patrimonio ?? "",
        descricao: i.item.descsbpm ?? "",
        servidorAnterior: i.servidorAnterior ?? "—",
        servidorAtual: i.servidorAtual ?? "—",
      })),
    }));

    return NextResponse.json({
      chamados,
      usuarios,
      usuarioLogadoId,
      perfilLogado: perfil,
      capacidades,
      unidades:
        incluirChamados || capacidades.patrimonio ? unidades : [],
      categorias: incluirChamados ? categorias : [],
      categoriasPai: incluirChamados ? categoriasPai : [],
      itens,
      transferencias,
      baixas,
      statusHistorico,
      numToUuid: Object.fromEntries(numToUuid),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[helpdesk/chamados GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessao = await getSessaoHelpdesk();
    if ("error" in sessao) {
      return NextResponse.json({ error: sessao.error }, { status: sessao.status });
    }

    const { usuario, isStaff } = sessao;

    if (!podeAbrirChamadosHelpdesk(usuario.permissao)) {
      return NextResponse.json(
        { error: "Sem permissão para abrir chamados" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    const descricao =
      typeof body.descricao === "string" ? body.descricao.trim() : "";
    const unidadeId =
      typeof body.unidadeId === "string"
        ? body.unidadeId.trim()
        : body.unidadeId != null
          ? String(body.unidadeId).trim()
          : "";
    const categoriaId = Number(body.categoriaId);
    const prioridade = body.prioridade as string;
    const solicitanteNumId = Number(body.solicitanteId);
    const abertoEmNomeDeNumId = body.abertoEmNomeDeId
      ? Number(body.abertoEmNomeDeId)
      : null;
    const telefone =
      typeof body.telefone === "string" ? body.telefone.trim() : undefined;
    const areaRaw =
      typeof body.areaAtual === "string" ? body.areaAtual.trim() : "";
    const areaAtual: TipoChamado = isTipoChamado(areaRaw)
      ? areaRaw
      : "suporte_tecnico";
    const itemId =
      body.itemId != null && body.itemId !== ""
        ? Number(body.itemId)
        : null;
    const observadorNumIds: number[] = Array.isArray(body.observadorIds)
      ? body.observadorIds.map(Number).filter((n: number) => !Number.isNaN(n))
      : [];
    if (!titulo) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }
    if (!descricao) {
      return NextResponse.json(
        { error: "Descrição é obrigatória" },
        { status: 400 }
      );
    }
    if (!unidadeId) {
      return NextResponse.json({ error: "Unidade é obrigatória" }, { status: 400 });
    }
    if (!categoriaId || Number.isNaN(categoriaId)) {
      return NextResponse.json(
        { error: "Categoria é obrigatória" },
        { status: 400 }
      );
    }
    if (!PRIORIDADES.has(prioridade)) {
      return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 });
    }

    const usuariosAtivos = await prisma.usuario.findMany({
      where: { status: true },
      select: { id: true },
    });
    const idsAtivos = new Set(usuariosAtivos.map((u) => u.id));
    const { uuidToNum, numToUuid } = buildUserIdMaps(idsAtivos);

    const solicitanteUuid = numToUuid.get(solicitanteNumId);
    if (!solicitanteUuid) {
      return NextResponse.json({ error: "Solicitante inválido" }, { status: 400 });
    }

    let abertoEmNomeDeId: string | null = null;
    if (!isStaff) {
      if (solicitanteUuid !== usuario.id) {
        // Colega abrindo o chamado por alguém que não consegue abrir sozinho
        // (ex.: sem internet). Fica registrado quem realmente preencheu, para rastreabilidade.
        abertoEmNomeDeId = usuario.id;
      } else if (abertoEmNomeDeNumId) {
        return NextResponse.json(
          { error: "Sem permissão para abrir em nome de outro usuário" },
          { status: 403 }
        );
      }
    } else if (abertoEmNomeDeNumId) {
      abertoEmNomeDeId = numToUuid.get(abertoEmNomeDeNumId) ?? null;
      if (!abertoEmNomeDeId) {
        return NextResponse.json(
          { error: "Usuário 'em nome de' inválido" },
          { status: 400 }
        );
      }
    }

    const [unidade, categoria] = await Promise.all([
      prisma.hdUnidade.findFirst({ where: { id: unidadeId, ativo: true } }),
      prisma.hdCategoria.findFirst({ where: { id: categoriaId, ativo: true } }),
    ]);

    if (!unidade) {
      return NextResponse.json({ error: "Unidade não encontrada" }, { status: 400 });
    }
    if (!categoria) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 400 });
    }

    const exigeItem = exigeComputadorNaAbertura(areaAtual);
    if (exigeItem && (!itemId || Number.isNaN(itemId))) {
      return NextResponse.json(
        { error: "Computador é obrigatório para esta área" },
        { status: 400 }
      );
    }

    const [item, solicitanteDb] = await Promise.all([
      itemId && !Number.isNaN(itemId)
        ? prisma.hdItemPatrimonio.findUnique({ where: { idbem: itemId } })
        : Promise.resolve(null),
      prisma.usuario.findUnique({
        where: { id: solicitanteUuid },
        select: { login: true },
      }),
    ]);

    if (exigeItem) {
      if (!item) {
        return NextResponse.json({ error: "Computador inválido" }, { status: 400 });
      }
      if ((item.tipo ?? "").trim().toLowerCase() !== "computador") {
        return NextResponse.json(
          { error: "Selecione um item do tipo Computador" },
          { status: 400 }
        );
      }
    } else if (itemId && !Number.isNaN(itemId) && !item) {
      return NextResponse.json({ error: "Item patrimonial inválido" }, { status: 400 });
    }

    if (!solicitanteDb) {
      return NextResponse.json({ error: "Solicitante inválido" }, { status: 400 });
    }

    const textoMensagemInicial = montarMensagemInicialChamado({
      descricaoUsuario: descricao,
      loginUsuario: solicitanteDb.login,
      nomeMaquina: item && item.tipo ? nomeMaquinaItemPatrimonio({ tipo: item.tipo, nomeRede: item.nomeRede }) : undefined,
      telefone,
      sala: unidade.sala,
    });

    const observadorUuids = observadorNumIds
      .map((n) => numToUuid.get(n))
      .filter((id): id is string => !!id && id !== solicitanteUuid);

    if (solicitanteUuid !== usuario.id && !observadorUuids.includes(usuario.id)) {
      observadorUuids.push(usuario.id);
    }

    const criado = await prisma.$transaction(async (tx) => {
      const chamado = await tx.hdChamado.create({
        data: {
          titulo: titulo.slice(0, 300),
          descricao,
          prioridade: prioridade as HdPrioridade,
          solicitanteId: solicitanteUuid,
          abertoEmNomeDeId,
          telefone: telefone?.slice(0, 30) || null,
          unidadeId,
          categoriaId,
          itemId: itemId && !Number.isNaN(itemId) ? itemId : null,
          areaOrigem: areaAtual as HdTipoChamado,
          areaAtual: areaAtual as HdTipoChamado,
        },
      });

      await tx.hdChamadoEvento.create({
        data: {
          chamadoId: chamado.id,
          tipo: "abertura",
          autorId: usuario.id,
          texto: textoAbertura(usuario.nome),
        },
      });

      const papeis: Array<{ usuarioId: string; papel: "observador" }> =
        observadorUuids.map((usuarioId) => ({ usuarioId, papel: "observador" }));

      for (const p of papeis) {
        await tx.hdChamadoUsuario.create({
          data: {
            chamadoId: chamado.id,
            usuarioId: p.usuarioId,
            papel: p.papel,
          },
        });
      }

      const msg = await tx.hdMensagem.create({
        data: {
          chamadoId: chamado.id,
          autorId: solicitanteUuid,
          texto: textoMensagemInicial,
          tipo: "publica",
        },
      });
      const mensagemInicialId = msg.id;

      return { chamadoId: chamado.id, mensagemInicialId };
    });

    const completo = await prisma.hdChamado.findUnique({
      where: { id: criado.chamadoId },
      include: chamadoInclude,
    });

    if (!completo) {
      return NextResponse.json(
        { error: "Chamado criado mas não encontrado" },
        { status: 500 }
      );
    }

    collectUserIdsFromChamados([completo]).forEach((id) => {
      if (!uuidToNum.has(id)) {
        const next = uuidToNum.size + 1;
        uuidToNum.set(id, next);
        numToUuid.set(next, id);
      }
    });

    return NextResponse.json(
      {
        chamado: mapChamadoApi(completo, uuidToNum, isStaff),
        mensagemInicialId: criado.mensagemInicialId,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[helpdesk/chamados POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
