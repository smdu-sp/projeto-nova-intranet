import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarPermissao } from "@/services/permissoes";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const temPermissao = await validarPermissao("usuarios.importar");
  if (!temPermissao) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const select = {
    id: true,
    nome: true,
    login: true,
    email: true,
    telefone: true,
    permissao: true,
    coordenadoriaId: true,
    coordenadoria: { select: { id: true, nome: true } },
  } as const;

  const params = new URL(request.url).searchParams;
  if (!params.has("pagina")) {
    const usuarios = await prisma.usuario.findMany({ orderBy: { nome: "asc" }, select });
    return NextResponse.json(usuarios);
  }

  // A tela de usuários pagina no servidor e espera { itens, total }.
  const pagina = Math.max(1, Number(params.get("pagina")) || 1);
  const limite = Math.min(100, Math.max(1, Number(params.get("limite")) || 10));
  const [itens, total] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: { nome: "asc" },
      select,
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.usuario.count(),
  ]);
  return NextResponse.json({ itens, total, pagina, limite });
}
