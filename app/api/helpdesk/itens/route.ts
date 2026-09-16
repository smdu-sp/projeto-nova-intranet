import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { parseItemPatrimonioBody } from "@/lib/helpdesk/item-patrimonio";
import { prisma } from "@/lib/prisma";
import { podeAcessarPatrimonioHelpdesk } from "@/lib/permissoes";

export const itemSelect = {
  idbem: true,
  patrimonio: true,
  tipo: true,
  descsbpm: true,
  numserie: true,
  marca: true,
  modelo: true,
  cimbpm: true,
  nomeRede: true,
  statusitem: true,
  unidadeId: true,
  servidorId: true,
  unidade: { select: { id: true, nome: true } },
  servidor: { select: { id: true, nome: true } },
} as const;

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

export async function GET() {
  const gate = await exigePatrimonio();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const lista = await prisma.hdItemPatrimonio.findMany({
    orderBy: [{ statusitem: "asc" }, { patrimonio: "asc" }],
    select: itemSelect,
  });
  return NextResponse.json(lista);
}

export async function POST(request: NextRequest) {
  const gate = await exigePatrimonio();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
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

  const parsed = parseItemPatrimonioBody(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const patrimonio = parsed.data.patrimonio as string;
  const existente = await prisma.hdItemPatrimonio.findUnique({
    where: { patrimonio },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Já existe um item com este patrimônio" },
      { status: 409 }
    );
  }

  const unidadeId = parsed.data.unidadeId as string;
  const unidade = await prisma.hdUnidade.findFirst({
    where: { id: unidadeId, ativo: true },
  });
  if (!unidade) {
    return NextResponse.json(
      { error: "Unidade não encontrada ou inativa" },
      { status: 400 }
    );
  }

  const servidorId = parsed.data.servidorId as string | null;
  if (servidorId) {
    const servidor = await prisma.usuario.findFirst({
      where: { id: servidorId, status: true },
    });
    if (!servidor) {
      return NextResponse.json(
        { error: "Servidor (responsável) não encontrado" },
        { status: 400 }
      );
    }
  }

  const item = await prisma.hdItemPatrimonio.create({
    data: {
      patrimonio,
      tipo: parsed.data.tipo as string,
      descsbpm: parsed.data.descsbpm as string,
      numserie: parsed.data.numserie as string | null,
      marca: parsed.data.marca as string | null,
      modelo: parsed.data.modelo as string | null,
      cimbpm: parsed.data.cimbpm as string | null,
      nomeRede: parsed.data.nomeRede as string | null,
      statusitem: (parsed.data.statusitem as string) ?? "Ativo",
      unidadeId,
      servidorId,
    },
    select: itemSelect,
  });

  return NextResponse.json(item, { status: 201 });
}
