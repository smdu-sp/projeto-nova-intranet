import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/usuarios/busca?q=termo — Busca usuários por nome, nomeSocial, login ou email (qualquer usuário logado). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json([]);
  }
  const coordenadoriaId = searchParams.get("coordenadoriaId")?.trim() || undefined;
  const usuarios = await prisma.usuario.findMany({
    where: {
      status: true,
      ...(coordenadoriaId ? { coordenadoriaId } : {}),
      OR: [
        { nome: { contains: q } },
        { nomeSocial: { contains: q } },
        { login: { contains: q } },
        { email: { contains: q } },
      ],
    },
    orderBy: { nome: "asc" },
    take: 15,
    select: {
      id: true,
      nome: true,
      nomeSocial: true,
      login: true,
      email: true,
    },
  });
  return NextResponse.json(
    usuarios.map((u) => ({
      id: u.id,
      nome: u.nomeSocial ?? u.nome,
      login: u.login,
      email: u.email,
    }))
  );
}
