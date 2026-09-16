import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { parseNomeUnidade } from "@/lib/helpdesk/unidade";
import { prisma } from "@/lib/prisma";
import { podeGerenciarUnidadesHelpdesk } from "@/lib/permissoes";

const unidadeSelect = {
  id: true,
  codigo: true,
  nome: true,
  raiz: true,
  sigla: true,
  sala: true,
  ativo: true,
} as const;

async function exigeAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autorizado", status: 401 as const };
  }
  const permissao = (session as { usuario?: { permissao?: string } }).usuario
    ?.permissao;
  if (!podeGerenciarUnidadesHelpdesk(permissao ?? "")) {
    return { error: "Sem permissão", status: 403 as const };
  }
  return { ok: true as const };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await exigeAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: {
    codigo?: string;
    nome?: string;
    sala?: string | null;
    ativo?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 }
    );
  }

  const data: {
    codigo?: string;
    nome?: string;
    raiz?: string;
    sigla?: string;
    sala?: string | null;
    ativo?: boolean;
  } = {};

  if (typeof body.codigo === "string") {
    const codigo = body.codigo.trim().toUpperCase();
    if (!codigo) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }
    const dup = await prisma.hdUnidade.findFirst({
      where: { codigo, id: { not: id } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Já existe uma unidade com este código" },
        { status: 409 }
      );
    }
    data.codigo = codigo;
  }

  if (typeof body.nome === "string") {
    const nomeRaw = body.nome.trim();
    if (!nomeRaw) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }
    try {
      const parsed = parseNomeUnidade(nomeRaw);
      data.nome = parsed.nome;
      data.raiz = parsed.raiz.slice(0, 100);
      data.sigla = parsed.sigla.slice(0, 100);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Nome inválido" },
        { status: 400 }
      );
    }
  }

  if (body.sala === null) {
    data.sala = null;
  } else if (typeof body.sala === "string") {
    data.sala = body.sala.trim() || null;
    if (data.sala && data.sala.length > 120) {
      return NextResponse.json(
        { error: "Sala: máximo 120 caracteres" },
        { status: 400 }
      );
    }
  }

  if (typeof body.ativo === "boolean") data.ativo = body.ativo;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo para atualizar" },
      { status: 400 }
    );
  }

  const unidade = await prisma.hdUnidade.update({
    where: { id },
    data,
    select: unidadeSelect,
  });

  return NextResponse.json(unidade);
}
