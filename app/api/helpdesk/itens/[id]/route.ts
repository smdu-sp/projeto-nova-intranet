import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import {
  normalizarStatusItem,
  parseItemPatrimonioBody,
  type StatusItemPatrimonio,
} from "@/lib/helpdesk/item-patrimonio";
import { getSessaoHelpdesk } from "@/lib/helpdesk/session";
import { alterarStatusItemPatrimonio } from "@/lib/helpdesk/status-historico-patrimonio";
import { prisma } from "@/lib/prisma";
import { podeAcessarPatrimonioHelpdesk } from "@/lib/permissoes";
import { itemSelect } from "../route";

async function exigePatrimonio() {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await exigePatrimonio();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: idParam } = await params;
  const idbem = Number.parseInt(idParam, 10);
  if (!Number.isFinite(idbem) || idbem < 1) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const existente = await prisma.hdItemPatrimonio.findUnique({
    where: { idbem },
  });
  if (!existente) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 }
    );
  }

  const parsed = parseItemPatrimonioBody(body, { partial: true });
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo para atualizar" },
      { status: 400 }
    );
  }

  if (parsed.data.patrimonio !== undefined) {
    const patrimonio = parsed.data.patrimonio as string;
    const dup = await prisma.hdItemPatrimonio.findFirst({
      where: { patrimonio, idbem: { not: idbem } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Já existe um item com este patrimônio" },
        { status: 409 }
      );
    }
  }

  if (parsed.data.unidadeId !== undefined) {
    const unidade = await prisma.hdUnidade.findFirst({
      where: { id: parsed.data.unidadeId as string, ativo: true },
    });
    if (!unidade) {
      return NextResponse.json(
        { error: "Unidade não encontrada ou inativa" },
        { status: 400 }
      );
    }
  }

  if (parsed.data.servidorId !== undefined && parsed.data.servidorId !== null) {
    const servidor = await prisma.usuario.findFirst({
      where: { id: parsed.data.servidorId as string, status: true },
    });
    if (!servidor) {
      return NextResponse.json(
        { error: "Servidor (responsável) não encontrado" },
        { status: 400 }
      );
    }
  }

  const motivoRaw =
    typeof body.motivo === "string" ? body.motivo.trim() : "";
  const statusMudou =
    parsed.data.statusitem !== undefined &&
    normalizarStatusItem(parsed.data.statusitem as string) !==
      normalizarStatusItem(existente.statusitem);

  if (statusMudou && !motivoRaw) {
    return NextResponse.json(
      { error: "Informe o motivo da alteração de status" },
      { status: 400 }
    );
  }

  if (statusMudou) {
    const sessao = await getSessaoHelpdesk();
    if ("error" in sessao) {
      return NextResponse.json({ error: sessao.error }, { status: sessao.status });
    }

    const statusNovo = normalizarStatusItem(
      parsed.data.statusitem as string
    ) as StatusItemPatrimonio;
    const { statusitem: _status, ...resto } = parsed.data;

    const item = await prisma.$transaction(async (tx) => {
      if (Object.keys(resto).length > 0) {
        await tx.hdItemPatrimonio.update({
          where: { idbem },
          data: resto,
        });
      }

      await alterarStatusItemPatrimonio(tx, {
        idItem: idbem,
        statusAnterior: existente.statusitem,
        statusNovo,
        motivo: motivoRaw,
        idUsuario: sessao.usuario.id,
      });

      return tx.hdItemPatrimonio.findUnique({
        where: { idbem },
        select: itemSelect,
      });
    });

    return NextResponse.json(item);
  }

  const item = await prisma.hdItemPatrimonio.update({
    where: { idbem },
    data: parsed.data,
    select: itemSelect,
  });

  return NextResponse.json(item);
}
