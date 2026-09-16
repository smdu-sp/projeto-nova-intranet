import { auth } from '@/lib/auth';
import { prisma } from "@/lib/prisma";
import {
  podeAtenderChamadosHelpdesk,
  podeAdministrarSistema,
} from "@/lib/permissoes";

export type PerfilHelpdesk = "ADM" | "TEC" | "USR";

/** Perfil simplificado para a UI do help desk (SUP → TEC; PAT → USR). */
export function mapPermissaoToPerfil(permissao: string): PerfilHelpdesk {
  if (permissao === "ADM" || permissao === "DEV") return "ADM";
  if (permissao === "TEC" || permissao === "SUP") return "TEC";
  return "USR";
}

export function isStaffPerfil(perfil: PerfilHelpdesk): boolean {
  return perfil === "ADM" || perfil === "TEC";
}

/** Pode atribuir técnicos e operar chamados. */
export function isStaffPermissao(permissao: string): boolean {
  return podeAtenderChamadosHelpdesk(permissao);
}

export { podeAdministrarSistema };

export async function getSessaoHelpdesk() {
  const session = await auth();
  if (!session?.user) {
    return { error: "Não autorizado" as const, status: 401 as const };
  }

  const login = (session as { usuario?: { login?: string } }).usuario?.login;
  if (!login) {
    return { error: "Usuário da sessão não encontrado", status: 401 as const };
  }

  const usuario = await prisma.usuario.findFirst({
    where: { login, status: true },
    select: {
      id: true,
      login: true,
      nome: true,
      permissao: true,
      email: true,
      telefone: true,
      status: true,
    },
  });

  if (!usuario) {
    return { error: "Usuário não encontrado ou inativo", status: 403 as const };
  }

  const perfil = mapPermissaoToPerfil(usuario.permissao);
  return { usuario, perfil, isStaff: isStaffPerfil(perfil) };
}
