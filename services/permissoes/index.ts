"use server";

import { auth } from "@/lib/auth";
import { temAcessoTotalModulos } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { Modulo } from "@/prisma/generated";

async function obterUsuarioSessao() {
  const session = await auth();
  if (!session?.usuario?.id) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.usuario.id },
    select: { id: true, desenvolvedor: true, permissao: true },
  });
  if (!usuario) return null;

  return {
    id: usuario.id,
    permissao: String(usuario.permissao ?? session.usuario.permissao ?? ""),
    desenvolvedor: usuario.desenvolvedor ?? session.usuario.desenvolvedor ?? false,
  };
}

async function verificarDesenvolvedor(): Promise<boolean> {
  const usuario = await obterUsuarioSessao();
  return usuario?.desenvolvedor ?? false;
}

async function listarPermissoes(modulo?: string): Promise<string[]> {
  const usuario = await obterUsuarioSessao();
  if (!usuario) return [];

  const acessoTotal = temAcessoTotalModulos(
    usuario.permissao,
    usuario.desenvolvedor,
  );

  const permissoes = await prisma.permissao.findMany({
    where: {
      ...(acessoTotal
        ? {}
        : { usuarios: { some: { usuarioId: usuario.id } } }),
      modulo: (modulo as Modulo) || undefined,
    },
    select: { nome: true },
  });

  return permissoes.map((p) => p.nome);
}

async function validarPermissao(permissao: string): Promise<boolean> {
  const usuario = await obterUsuarioSessao();
  if (!usuario) return false;

  if (temAcessoTotalModulos(usuario.permissao, usuario.desenvolvedor)) {
    return true;
  }

  const vinculo = await prisma.usuarioPermissao.findFirst({
    where: {
      usuarioId: usuario.id,
      permissao: { nome: permissao },
    },
  });

  return !!vinculo;
}

export { verificarDesenvolvedor, listarPermissoes, validarPermissao };
