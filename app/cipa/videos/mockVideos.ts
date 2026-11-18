export interface MockVideoItem {
  id: number;
  title: string;
  description: string;
  category: string;
  duration: string;
  status: string;
  hasCaptions: boolean;
  topics: string[];
}

export const mockVideos: MockVideoItem[] = [
  {
    id: 1,
    title: "O que é a CIPA SMUL e como atuamos?",
    description:
      "Apresentação da Comissão Interna de Prevenção de Acidentes e Assédio, atribuições dos grupos de trabalho e formas de participação.",
    category: "Institucional",
    duration: "03:45",
    status: "Em breve",
    hasCaptions: true,
    topics: ["Papel da CIPA", "Grupos de Trabalho", "Canais de contato"],
  },
  {
    id: 2,
    title: "Prevenção de Quedas e Acidentes no Escritório",
    description:
      "Cuidados essenciais no dia a dia com fios expostos, pisos molhados, desníveis, escadas e organização dos corredores.",
    category: "Prevenção de Acidentes",
    duration: "04:20",
    status: "Em breve",
    hasCaptions: true,
    topics: ["Fatores ambientais", "Uso correto de escadas", "Sinalização"],
  },
  {
    id: 3,
    title: "Ergonomia e Postura nas Estações de Trabalho",
    description:
      "Ajuste correto de cadeiras, altura do monitor, apoio dos pés e pausas ativas para prevenir dores e LER/DORT.",
    category: "Saúde e Ergonomia",
    duration: "05:10",
    status: "Em breve",
    hasCaptions: true,
    topics: ["Regulagem de mobiliário", "Alongamentos", "Pausas visuais"],
  },
  {
    id: 4,
    title: "Prevenção e Enfrentamento ao Assédio Moral e Sexual",
    description:
      "Como identificar condutas abusivas no ambiente de trabalho e acionar com segurança o Canal de Acolhimento da CIPA.",
    category: "Acolhimento",
    duration: "06:00",
    status: "Em breve",
    hasCaptions: true,
    topics: ["Identificação de assédio", "Sigilo e acolhimento", "Fluxo de denúncia"],
  },
  {
    id: 5,
    title: "Segurança Elétrica no Ambiente de Trabalho",
    description:
      "Boas práticas ao ligar equipamentos, evitar sobrecarga em extensões e manusear tomadas com segurança.",
    category: "Segurança Elétrica",
    duration: "03:15",
    status: "Em breve",
    hasCaptions: true,
    topics: ["Retirada pelo plug", "Extensões e benjamins", "Pontos exclusivos"],
  },
  {
    id: 6,
    title: "Como registrar uma CAT (Comunicação de Acidente de Trabalho)",
    description:
      "Passo a passo para comunicar acidentes ocorridos no local de trabalho ou no trajeto entre a residência e a SMUL.",
    category: "Orientações",
    duration: "04:50",
    status: "Em breve",
    hasCaptions: true,
    topics: ["Acidente típico e de trajeto", "Prazos", "Documentação necessária"],
  },
];

