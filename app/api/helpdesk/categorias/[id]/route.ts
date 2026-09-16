import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessaoHelpdesk } from "@/lib/helpdesk/session";
import { podeGerenciarCategoriasHelpdesk } from "@/lib/permissoes";
import { isTipoChamado } from "@/lib/helpdesk/tipos-chamado";
import type { HdTipoChamado } from "@/prisma/generated";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await getSessaoHelpdesk();
  if ("error" in sessao) {
    return NextResponse.json({ error: sessao.error }, { status: sessao.status });
  }
  if (!podeGerenciarCategoriasHelpdesk(sessao.usuario.permissao)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const categoriaId = parseInt(id, 10);
  if (Number.isNaN(categoriaId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await request.json();
  const data: {
    nome?: string;
    pai?: string;
    filho?: string | null;
    area?: HdTipoChamado | null;
    ativo?: boolean;
  } = {};

  if (typeof body.nome === "string" && body.nome.trim()) data.nome = body.nome.trim();
  if (typeof body.pai === "string" && body.pai.trim()) data.pai = body.pai.trim();
  if (body.filho !== undefined) {
    data.filho = typeof body.filho === "string" && body.filho.trim() ? body.filho.trim() : null;
  }
  if (body.area !== undefined) {
    data.area =
      typeof body.area === "string" && isTipoChamado(body.area)
        ? (body.area as HdTipoChamado)
        : null;
  }
  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  const atualizada = await prisma.hdCategoria.update({
    where: { id: categoriaId },
    data,
  });

  return NextResponse.json({ categoria: atualizada });
}
