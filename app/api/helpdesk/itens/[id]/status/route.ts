import { NextRequest, NextResponse } from "next/server";
import { normalizarStatusItem } from "@/lib/helpdesk/item-patrimonio";
import { getSessaoHelpdesk } from "@/lib/helpdesk/session";
import {
  alterarStatusItemPatrimonio,
  parseAlteracaoStatusBody,
} from "@/lib/helpdesk/status-historico-patrimonio";
import { movimentarItemParaAtic } from "@/lib/helpdesk/transferencia-patrimonio";
import { prisma } from "@/lib/prisma";
import { podeAcessarPatrimonioHelpdesk } from "@/lib/permissoes";
import { itemSelect } from "../../route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessao = await getSessaoHelpdesk();
    if ("error" in sessao) {
      return NextResponse.json(
        { error: sessao.error },
        { status: sessao.status }
      );
    }

    if (!podeAcessarPatrimonioHelpdesk(sessao.usuario.permissao)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { id: idParam } = await params;
    const idbem = Number.parseInt(idParam, 10);
    if (!Number.isFinite(idbem) || idbem < 1) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
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

    const parsed = parseAlteracaoStatusBody(body);
    if (parsed.error || !parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const item = await prisma.hdItemPatrimonio.findUnique({
      where: { idbem },
    });
    if (!item) {
      return NextResponse.json(
        { error: "Item não encontrado" },
        { status: 404 }
      );
    }

    const statusAnterior = normalizarStatusItem(item.statusitem);
    const { statusNovo, motivo } = parsed.data;

    if (statusAnterior === statusNovo) {
      return NextResponse.json(
        { error: "O item já está com este status" },
        { status: 409 }
      );
    }

    const observacaoTransferencia = `Movimentação automática — alteração de status para "${statusNovo}". Motivo: ${motivo}`;

    const atualizado = await prisma.$transaction(async (tx) => {
      await movimentarItemParaAtic(tx, {
        idItem: idbem,
        idUsuario: sessao.usuario.id,
        observacao: observacaoTransferencia,
      });

      await alterarStatusItemPatrimonio(tx, {
        idItem: idbem,
        statusAnterior,
        statusNovo,
        motivo,
        idUsuario: sessao.usuario.id,
        limparServidor: true,
      });

      return tx.hdItemPatrimonio.findUnique({
        where: { idbem },
        select: itemSelect,
      });
    });

    return NextResponse.json(atualizado);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[helpdesk/itens/[id]/status POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
