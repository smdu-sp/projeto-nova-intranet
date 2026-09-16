import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessaoHelpdesk } from "@/lib/helpdesk/session";
import { podeGerenciarCategoriasHelpdesk } from "@/lib/permissoes";
import { isTipoChamado } from "@/lib/helpdesk/tipos-chamado";
import type { HdTipoChamado } from "@/prisma/generated";

export async function GET() {
  const sessao = await getSessaoHelpdesk();
  if ("error" in sessao) {
    return NextResponse.json({ error: sessao.error }, { status: sessao.status });
  }
  if (!podeGerenciarCategoriasHelpdesk(sessao.usuario.permissao)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const categorias = await prisma.hdCategoria.findMany({
    orderBy: [{ ativo: "desc" }, { pai: "asc" }, { filho: "asc" }],
  });

  return NextResponse.json({ categorias });
}

export async function POST(request: NextRequest) {
  const sessao = await getSessaoHelpdesk();
  if ("error" in sessao) {
    return NextResponse.json({ error: sessao.error }, { status: sessao.status });
  }
  if (!podeGerenciarCategoriasHelpdesk(sessao.usuario.permissao)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json();
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const pai = typeof body.pai === "string" ? body.pai.trim() : "";
  const filho =
    typeof body.filho === "string" && body.filho.trim() ? body.filho.trim() : null;
  const area =
    typeof body.area === "string" && isTipoChamado(body.area)
      ? (body.area as HdTipoChamado)
      : null;

  if (!nome || !pai) {
    return NextResponse.json({ error: "Nome e categoria pai são obrigatórios" }, { status: 400 });
  }

  const criada = await prisma.hdCategoria.create({
    data: { nome, pai, filho, area, ativo: true },
  });

  return NextResponse.json({ categoria: criada }, { status: 201 });
}
