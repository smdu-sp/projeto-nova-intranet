export interface CampaignItem {
  id: number;
  month: string;
  year: string;
  tag: string;
  title: string;
  description: string;
  /**
   * Caminho da imagem dentro da pasta `public/`.
   * Exemplo: adicione o arquivo em `public/cipa/campanhas/outubro-2026.jpg`
   * e informe `/cipa/campanhas/outubro-2026.jpg` abaixo.
   */
  imageSrc: string;
}

export const mockCampaigns: CampaignItem[] = [
  {
    id: 1,
    month: "Outubro",
    year: "2026",
    tag: "Saúde e Prevenção",
    title: "Outubro Rosa — Cuidado e Prevenção",
    description:
      "Campanha de conscientização sobre a importância do diagnóstico precoce e dos exames preventivos de saúde.",
    imageSrc: "/cipa/campanhas/cartaz-outubro-2026.jpg",
  },
  {
    id: 2,
    month: "Setembro",
    year: "2026",
    tag: "Saúde Mental",
    title: "Setembro Amarelo — Valorização da Vida",
    description:
      "Acolhimento, escuta ativa e divulgação dos canais de apoio à saúde mental para servidores da SMUL.",
    imageSrc: "/cipa/campanhas/cartaz-setembro-2026.jpg",
  },
  {
    id: 3,
    month: "Agosto",
    year: "2026",
    tag: "Respeito no Trabalho",
    title: "Combate ao Assédio Moral e Sexual",
    description:
      "Orientações sobre como identificar situações de assédio no ambiente de trabalho e acionar o canal sigiloso de acolhimento.",
    imageSrc: "/cipa/campanhas/cartaz-agosto-2026.jpg",
  },
  {
    id: 4,
    month: "Julho",
    year: "2026",
    tag: "Ergonomia",
    title: "Postura e Pausas Ativas no Dia a Dia",
    description:
      "Dicas práticas de ajuste da estação de trabalho, alongamentos rápidos e prevenção de LER/DORT.",
    imageSrc: "/cipa/campanhas/cartaz-julho-2026.jpg",
  },
  {
    id: 5,
    month: "Junho",
    year: "2026",
    tag: "Segurança",
    title: "Rotas de Fuga e Prevenção de Incêndios",
    description:
      "Boas práticas de segurança predial, sinalização de emergência e cuidados com equipamentos elétricos.",
    imageSrc: "/cipa/campanhas/cartaz-junho-2026.jpg",
  },
  {
    id: 6,
    month: "Abril",
    year: "2026",
    tag: "Abril Verde",
    title: "Segurança e Saúde no Trabalho",
    description:
      "Mês dedicado à conscientização sobre prevenção de acidentes de trabalho e promoção de um ambiente saudável.",
    imageSrc: "/cipa/campanhas/cartaz-abril-2026.jpg",
  },
];

