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

export async function GET() {
  const gate = await exigeAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const lista = await prisma.hdUnidade.findMany({
    orderBy: [{ raiz: "asc" }, { nome: "asc" }],
    select: unidadeSelect,
  });
  return NextResponse.json(lista);
}

export async function POST(request: NextRequest) {
  const gate = await exigeAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { codigo?: string; nome?: string; sala?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 }
    );
  }

  const codigo =
    typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
  const nomeRaw = typeof body.nome === "string" ? body.nome.trim() : "";
  const sala =
    body.sala === null || body.sala === undefined
      ? null
      : typeof body.sala === "string"
        ? body.sala.trim() || null
        : null;

  if (!codigo) {
    return NextResponse.json({ error: "Código é obrigatório" }, { status: 400 });
  }
  if (codigo.length > 20) {
    return NextResponse.json(
      { error: "Código: máximo 20 caracteres" },
      { status: 400 }
    );
  }
  if (!nomeRaw) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  let parsed: ReturnType<typeof parseNomeUnidade>;
  try {
    parsed = parseNomeUnidade(nomeRaw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Nome inválido" },
      { status: 400 }
    );
  }

  const existente = await prisma.hdUnidade.findUnique({ where: { codigo } });
  if (existente) {
    return NextResponse.json(
      { error: "Já existe uma unidade com este código" },
      { status: 409 }
    );
  }

  const unidade = await prisma.hdUnidade.create({
    data: {
      codigo,
      nome: parsed.nome,
      raiz: parsed.raiz.slice(0, 100),
      sigla: parsed.sigla.slice(0, 100),
      sala: sala?.slice(0, 120) ?? null,
      ativo: true,
    },
    select: unidadeSelect,
  });

  return NextResponse.json(unidade, { status: 201 });
}
