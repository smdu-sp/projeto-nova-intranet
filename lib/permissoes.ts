/**
 * Permissões do sistema (campo Usuario.permissao).
 *
 * TEC — técnico: atende chamados; sem patrimônio/inventário.
 * SUP — supervisor de suporte: todas as funções de suporte; sem patrimônio/inventário.
 * ADM / DEV — administradores: acesso total.
 * PAT — gestor de patrimônio: patrimônio e transferências; não atende chamados.
 * USR — usuário final: abre chamados.
 */

export const PERMISSOES = ["DEV", "ADM", "TEC", "SUP", "PAT", "USR"] as const;
export type Permissao = (typeof PERMISSOES)[number];

export type CapacidadesHelpdesk = {
  atenderChamados: boolean;
  abrirChamados: boolean;
  patrimonio: boolean;
  unidades: boolean;
  relatorios: boolean;
  /** Cadastro de permissões por sistema e pontos focais */
  gerenciarAcessoSistemas: boolean;
  /** Cadastro de categorias de chamado e o setor para o qual cada uma é enviada */
  gerenciarCategorias: boolean;
};

export function getCapacidadesHelpdesk(permissao: string): CapacidadesHelpdesk {
  return {
    atenderChamados: podeAtenderChamadosHelpdesk(permissao),
    abrirChamados: podeAbrirChamadosHelpdesk(permissao),
    patrimonio: podeAcessarPatrimonioHelpdesk(permissao),
    unidades: podeGerenciarUnidadesHelpdesk(permissao),
    relatorios: podeVerRelatoriosHelpdesk(permissao),
    gerenciarAcessoSistemas: podeGerenciarAcessoSistemasHelpdesk(permissao),
    gerenciarCategorias: podeGerenciarCategoriasHelpdesk(permissao),
  };
}

/** Catálogo de permissões e pontos focais de acesso a sistemas. */
export function podeGerenciarAcessoSistemasHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "SUP"].includes(permissao);
}

/** Atribuir, resolver e operar chamados como técnico/supervisor. */
export function podeAtenderChamadosHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "TEC", "SUP"].includes(permissao);
}

/** Abrir chamados (solicitante ou em nome de). */
export function podeAbrirChamadosHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "TEC", "SUP", "USR"].includes(permissao);
}

/** Inventário, patrimônio e transferências de bens. */
export function podeAcessarPatrimonioHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "PAT"].includes(permissao);
}

/** Cadastro de unidades de atendimento do help desk. */
export function podeGerenciarUnidadesHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "SUP"].includes(permissao);
}

/** Cadastro de categorias de chamado e do setor para o qual cada uma é roteada. */
export function podeGerenciarCategoriasHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "SUP"].includes(permissao);
}

/** Relatórios operacionais do help desk. */
export function podeVerRelatoriosHelpdesk(permissao: string): boolean {
  return ["DEV", "ADM", "TEC", "SUP"].includes(permissao);
}

/** Usuários do sistema, coordenadorias, salas etc. */
export function podeAdministrarSistema(permissao: string): boolean {
  return permissao === "DEV" || permissao === "ADM";
}

/** Acesso total aos módulos (reserva de salas, avaliação, gestão de pessoas). */
export function temAcessoTotalModulos(permissao: string, desenvolvedor = false): boolean {
  return desenvolvedor || permissao === "DEV" || permissao === "ADM";
}

/** Pode selecionar item de patrimônio ao abrir chamado (leitura). */
export function podeSelecionarItemEmChamado(permissao: string): boolean {
  return podeAbrirChamadosHelpdesk(permissao);
}

export function podeAcessarAreaChamadosHelpdesk(permissao: string): boolean {
  return podeAbrirChamadosHelpdesk(permissao) || podeAtenderChamadosHelpdesk(permissao);
}
