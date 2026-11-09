export interface MockInfoProps {
  id: number;
  title: string;
  description: string;
  details: string;
  href?: string;
  actionLabel?: string;
}

export interface TableInfoProps {
  id: number;
  theme: string;
  description: string;
  access: string;
  href?: string;
  topicId?: number;
}

export const MockInfo: MockInfoProps[] = [
  {
    id: 1,
    title: "SIPAT",
    description:
      "Semana Interna de Prevenção de Acidentes do Trabalho — saiba mais.",
    details:
      "A SIPAT reúne palestras, oficinas, rodas de conversa e atividades educativas voltadas à saúde física, mental e segurança de todos os servidores da SMUL.",
  },
  {
    id: 2,
    title: "Temas que tratamos",
    description: "Para saber mais sobre os assuntos que a CIPA acompanha.",
    details:
      "Ergonomia, prevenção de quedas, segurança elétrica, saúde mental, acolhimento contra assédio e melhoria contínua das condições nos andares.",
    href: "/mockup/campanhas",
    actionLabel: "Ver campanhas publicadas",
  },
  {
    id: 3,
    title: "CAT",
    description:
      "Comunicação de Acidente de Trabalho — como fazer, onde procurar.",
    details:
      "Todo acidente ocorrido no exercício do trabalho ou no trajeto deve ser comunicado imediatamente à chefia imediata e à unidade de Gestão de Pessoas (CAF/DGP) para registro da CAT.",
  },
  {
    id: 4,
    title: "Legislação",
    description:
      "Normas e legislação sobre segurança e saúde no trabalho.",
    details:
      "Consulte as Normas Regulamentadoras (NRs), decretos municipais e diretrizes da Prefeitura de São Paulo aplicáveis à CIPA no serviço público.",
  },
  {
    id: 5,
    title: "Mapa de risco",
    description: "Mapeamento dos riscos identificados por setor.",
    details:
      "Representação gráfica dos fatores de risco (físicos, químicos, biológicos, ergonômicos e de acidentes) identificados nas vistorias periódicas de cada andar da SMUL.",
  },
  {
    id: 6,
    title: "Assédio",
    description:
      "Informações sobre prevenção e acolhimento em casos de assédio.",
    details:
      "A CIPA SMUL mantém canal de escuta sigilosa e orientações para prevenção e enfrentamento ao assédio moral e sexual no ambiente de trabalho.",
    href: "/mockup/fale-conosco#acolhimento",
    actionLabel: "Acessar canal de acolhimento",
  },
  {
    id: 7,
    title: "Calendário de reuniões e atas",
    description: "Datas dos encontros da CIPA e atas já registradas.",
    details:
      "As reuniões ordinárias da CIPA ocorrem mensalmente, com registro em ata das deliberações, encaminhamentos de vistorias e cronograma das ações.",
  },
  {
    id: 8,
    title: "Perguntas frequentes",
    description: "Dúvidas comuns sobre a CIPA e como ela atua.",
    details:
      "Saiba como acionar um cipeiro do seu andar, como sugerir pautas nas caixas de recado e como participar das ações preventivas.",
  },
  {
    id: 9,
    title: "Artigos",
    description: "Textos e materiais aprofundando nossos temas.",
    details:
      "Publicações educativas e guias rápidos elaborados pelos grupos de trabalho de Saúde, Comunicação, Vistorias e SIPAT.",
  },
];

export const TableInfo: TableInfoProps[] = [
  {
    id: 1,
    theme: "Cartaz do mês (histórico)",
    description: "Cartazes já publicados, disponíveis para consulta na linha do tempo.",
    access: "Acessar linha do tempo",
    href: "/mockup/campanhas",
    topicId: 2,
  },
  {
    id: 2,
    theme: "E-mails informativos",
    description: "Comunicados enviados periodicamente pela CIPA.",
    access: "Em breve",
    topicId: 2,
  },
  {
    id: 3,
    theme: "Mapa de risco",
    description: "Mapeamento de riscos por unidade/setor.",
    access: "Em breve",
    topicId: 5,
  },
  {
    id: 4,
    theme: "Legislação",
    description: "Normas regulamentadoras e legislação aplicável.",
    access: "Em breve",
    topicId: 4,
  },
  {
    id: 5,
    theme: "CAT — Comunicação de Acidente de Trabalho",
    description: "Como preencher e onde encaminhar.",
    access: "Ver orientações",
    topicId: 3,
  },
  {
    id: 6,
    theme: "Assédio — acolhimento e orientações",
    description: "Como identificar, denunciar e buscar apoio.",
    access: "Canal de acolhimento",
    href: "/mockup/fale-conosco#acolhimento",
    topicId: 6,
  },
  {
    id: 7,
    theme: "Calendário e atas de reuniões",
    description: "Datas dos encontros e registros das decisões da CIPA.",
    access: "Em breve",
    topicId: 7,
  },
  {
    id: 8,
    theme: "Perguntas frequentes (FAQ)",
    description: "Respostas para as dúvidas mais comuns.",
    access: "Ver orientações",
    topicId: 8,
  },
  {
    id: 9,
    theme: "Artigos e temas",
    description: "Conteúdos aprofundando prevenção e saúde no trabalho.",
    access: "Em breve",
    topicId: 9,
  },
];
