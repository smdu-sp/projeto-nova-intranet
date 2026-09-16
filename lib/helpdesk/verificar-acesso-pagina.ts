import { auth } from '@/lib/auth';
import {
  getCapacidadesHelpdesk,
  podeAcessarAreaChamadosHelpdesk,
  podeAcessarPatrimonioHelpdesk,
  podeGerenciarUnidadesHelpdesk,
  podeVerRelatoriosHelpdesk,
} from "@/lib/permissoes";
import { redirect } from "next/navigation";

export type AreaHelpdeskPagina =
  | "chamados"
  | "patrimonio"
  | "unidades"
  | "relatorios";

function permissaoDaSessao(session: unknown): string {
  return (
    (session as { usuario?: { permissao?: string } })?.usuario?.permissao ?? ""
  );
}

export async function obterPermissaoSessao(): Promise<string> {
  const session = await auth();
  return permissaoDaSessao(session);
}

export async function verificarAcessoPaginaHelpdesk(
  area: AreaHelpdeskPagina
): Promise<string> {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const permissao = permissaoDaSessao(session);

  const permitido = {
    chamados: podeAcessarAreaChamadosHelpdesk(permissao),
    patrimonio: podeAcessarPatrimonioHelpdesk(permissao),
    unidades: podeGerenciarUnidadesHelpdesk(permissao),
    relatorios: podeVerRelatoriosHelpdesk(permissao),
  }[area];

  if (!permitido) {
    if (podeAcessarPatrimonioHelpdesk(permissao)) {
      redirect("/helpdesk/patrimonio");
    }
    if (podeAcessarAreaChamadosHelpdesk(permissao)) {
      redirect("/helpdesk");
    }
    redirect("/home");
  }

  return permissao;
}

export async function obterCapacidadesSessaoHelpdesk() {
  const permissao = await obterPermissaoSessao();
  return getCapacidadesHelpdesk(permissao);
}
