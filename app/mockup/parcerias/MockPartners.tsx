export interface MockPartnersProps {
  id: number;
  position: number;
  tema: string;
  category: "Oficinas" | "PICS" | "Acolhimento";
  description: string;
  details: string;
  access: string;
  href?: string;
}

export const PARTNER_CATEGORIES = [
  "Todas",
  "PICS",
  "Oficinas",
  "Acolhimento",
] as const;

export const MockPartners: MockPartnersProps[] = [
  {
    id: 1,
    position: 1,
    tema: "Oficina de Cozinha — Receitas Fáceis e Práticas",
    category: "Oficinas",
    description:
      "Dra. Marcela Deganello ensinando receitas fáceis, práticas e saudáveis, para serem aplicadas no dia a dia.",
    details:
      "Encontros demonstrativos com dicas de nutrição, aproveitamento integral de alimentos e preparo rápido de refeições equilibradas para a rotina de trabalho.",
    access: "Visualizar aviso",
  },
  {
    id: 2,
    position: 2,
    tema: "Ambulatório de Práticas Integrativas — PICS",
    category: "PICS",
    description: "Reiki",
    details:
      "Sessões individuais de Reiki voltadas ao equilíbrio energético, redução do estresse e promoção do bem-estar dos servidores.",
    access: "Inscrição",
  },
  {
    id: 3,
    position: 3,
    tema: "Ambulatório de Práticas Integrativas — PICS",
    category: "PICS",
    description: "Acupuntura",
    details:
      "Atendimento com técnicas da medicina tradicional chinesa para alívio de dores osteomusculares, ansiedade e tensões do dia a dia.",
    access: "Inscrição",
  },
  {
    id: 4,
    position: 4,
    tema: "Ambulatório de Práticas Integrativas — PICS",
    category: "PICS",
    description: "Técnicas de Relaxamento",
    details:
      "Práticas guiadas de respiração consciente e desaceleração física e mental durante a jornada de trabalho.",
    access: "Inscrição",
  },
  {
    id: 5,
    position: 5,
    tema: "Ambulatório de Práticas Integrativas — PICS",
    category: "PICS",
    description: "Quick Massage",
    details:
      "Massagem rápida em cadeira ergonômica focada na região cervical, ombros, costas e braços para alívio imediato de tensões.",
    access: "Inscrição",
  },
  {
    id: 6,
    position: 6,
    tema: "Ambulatório de Práticas Integrativas — PICS",
    category: "PICS",
    description: "Lian Gong",
    details:
      "Ginástica terapêutica chinesa em grupo para prevenção e tratamento de dores no corpo e melhora da postura.",
    access: "Inscrição",
  },
  {
    id: 7,
    position: 7,
    tema: "Ambulatório de Práticas Integrativas — PICS",
    category: "PICS",
    description: "Meditação — Iniciantes",
    details:
      "Encontros introdutórios de atenção plena (mindfulness) e meditação para redução do estresse e melhoria da concentração.",
    access: "Inscrição",
  },
  {
    id: 8,
    position: 8,
    tema: "Assédio Moral",
    category: "Acolhimento",
    description: "Acolhimento e Orientações",
    details:
      "Canal permanente de escuta, acolhimento sigiloso e orientação institucional sobre como identificar e denunciar situações de assédio moral.",
    access: "Acessar",
    href: "/mockup/fale-conosco#acolhimento",
  },
  {
    id: 9,
    position: 9,
    tema: "Assédio Sexual",
    category: "Acolhimento",
    description: "Acolhimento e Orientações",
    details:
      "Atendimento prioritário e sigiloso com informações claras sobre os fluxos de proteção, acolhimento e denúncia na Prefeitura de São Paulo.",
    access: "Acessar",
    href: "/mockup/fale-conosco#acolhimento",
  },
];
