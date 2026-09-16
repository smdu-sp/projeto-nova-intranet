export const TIPOS_CHAMADO = [
  "suporte_tecnico",
  "telefonia_voip",
  "acesso_sistemas",
  "rede_conectividade",
  "reparos_infraestrutura",
] as const;

export type TipoChamado = (typeof TIPOS_CHAMADO)[number];

export const TIPO_CHAMADO_META: Record<
  TipoChamado,
  { label: string; descricao: string; slug: string; cor: string; corBg: string; corText: string }
> = {
  suporte_tecnico: {
    label: "Suporte Técnico",
    descricao: "Computadores, impressoras, software e equipamentos de TI",
    slug: "suporte-tecnico",
    cor: "#0A328D",
    corBg: "#D9E1F4",
    corText: "#0A328D",
  },
  telefonia_voip: {
    label: "Telefonia VoIP",
    descricao: "Ramais, telefones IP e serviços de voz",
    slug: "telefonia-voip",
    cor: "#2E7D6E",
    corBg: "#D1EBE8",
    corText: "#0F4F4A",
  },
  acesso_sistemas: {
    label: "Acesso a Sistemas",
    descricao: "Liberação, senhas e permissões em sistemas",
    slug: "acesso-sistemas",
    cor: "#6B3E91",
    corBg: "#EEE2F7",
    corText: "#4F2A70",
  },
  rede_conectividade: {
    label: "Rede e Conectividade",
    descricao: "Internet, cabeamento e infraestrutura de rede",
    slug: "rede-conectividade",
    cor: "#E56E14",
    corBg: "#FCE5D0",
    corText: "#7A3A0B",
  },
  reparos_infraestrutura: {
    label: "Reparos de Infraestrutura",
    descricao: "Reparos físicos em infraestrutura predial e de TI",
    slug: "reparos-infraestrutura",
    cor: "#C0392B",
    corBg: "#FBDADA",
    corText: "#7A1F1F",
  },
};

const TIPO_POR_SLUG = Object.fromEntries(
  TIPOS_CHAMADO.map((t) => [TIPO_CHAMADO_META[t].slug, t])
) as Record<string, TipoChamado>;

export function tipoChamadoPorSlug(slug: string): TipoChamado | undefined {
  return TIPO_POR_SLUG[slug];
}

export function labelTipoChamado(tipo: TipoChamado): string {
  return TIPO_CHAMADO_META[tipo].label;
}

export function slugTipoChamado(tipo: TipoChamado): string {
  return TIPO_CHAMADO_META[tipo].slug;
}

export function rotaChamadosArea(tipo: TipoChamado): string {
  return `/helpdesk/chamados/${slugTipoChamado(tipo)}`;
}

export function isTipoChamado(valor: string): valor is TipoChamado {
  return (TIPOS_CHAMADO as readonly string[]).includes(valor);
}

/** Tipos em que o vínculo com computador é obrigatório na abertura */
export function exigeComputadorNaAbertura(tipo: TipoChamado): boolean {
  return tipo === "suporte_tecnico";
}

/**
 * Uma categoria pai é compatível com uma área quando existe alguma categoria
 * cadastrada com esse `pai` cujo setor configurado (`HdCategoria.area`,
 * editável em /helpdesk/categorias) é o mesmo da área informada. Categorias
 * sem setor configurado são consideradas compatíveis com qualquer área.
 */
export function categoriaCompativelComArea<
  C extends { pai: string; area?: TipoChamado | null }
>(categorias: C[], pai: string, tipo: TipoChamado): boolean {
  const daPai = categorias.filter((c) => c.pai === pai);
  if (daPai.length === 0) return true;
  return daPai.some((c) => !c.area || c.area === tipo);
}
