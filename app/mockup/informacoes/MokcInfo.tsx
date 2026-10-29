interface MockInfoProps {
  id: number;
  title: string;
  description: string;
}

interface TableInfoProps {
  id: number;
  theme: string;
  description: string;
  access: string;
}

export const MockInfo: MockInfoProps[] = [
  {
    id: 1,
    title: "SIPAT",
    description: "Semana Interna de Prevenção de Acidentes do Trabalho — saiba mais.",
  },
  {
    id: 2,
    title: "Temas que tratamos",
    description: "Para saber mais sobre os assuntos que a CIPA acompanha.",
  },
  {
    id: 3,
    title: "CAT",
    description: "Comunicação de Acidente de Trabalho — como fazer, onde procurar.",
  },
  {
    id: 4,
    title: "Legislação",
    description: "Normas e legislação sobre segurança e saúde no trabalho.",
  },
  {
    id: 5,
    title: "Mapa de risco",
    description: "Mapeamento dos riscos identificados por setor.",
  },
  {
    id: 6,
    title: "Assédio",
    description: "Informações sobre prevenção e acolhimento em casos de assédio.",
  },
  {
    id: 7,
    title: "Calendário de reuniões e atas",
    description: "Datas dos encontros da CIPA e atas já registradas.",
  },
  {
    id: 8,
    title: "Perguntas frequentes",
    description: "Dúvidas comuns sobre a CIPA e como ela atua.",
  },
  {
    id: 9,
    title: "Artigos",
    description: "Textos e materiais aprofundando nossos temas.",
  },
];

export const TableInfo: TableInfoProps[] = [
  {
    id: 1,
    theme: "Cartaz do mês (histórico)",
    description: "Cartazes já publicados, disponíveis para consulta.",
    access: "Em breve",
  },
  {
    id: 2,
    theme: "E-mails informativos",
    description: "Comunicados enviados periodicamente pela CIPA.",
    access: "Em breve",
  },
  {
    id: 3,
    theme: "Mapa de risco",
    description: "Mapeamento de riscos por unidade/setor.",
    access: "Em breve",
  },
  {
    id: 4,
    theme: "Legislação",
    description: "Normas regulamentadoras e legislação aplicável.",
    access: "Em breve",
  },
  {
    id: 5,
    theme: "CAT — Comunicação de Acidente de Trabalho",
    description: "Como preencher e onde encaminhar.",
    access: "Em breve",
  },
  {
    id: 6,
    theme: "Assédio — acolhimento e orientações",
    description: "Como identificar, denunciar e buscar apoio.",
    access: "Em breve",
  },
  {
    id: 7,
    theme: "Calendário e atas de reuniões",
    description: "Datas dos encontros e registros das decisões da CIPA.",
    access: "Em breve",
  },
  {
    id: 8,
    theme: "Perguntas frequentes (FAQ)",
    description: "Respostas para as dúvidas mais comuns.",
    access: "Em breve",
  },
  {
    id: 9,
    theme: "Artigos e temas",
    description: "Conteúdos aprofundando prevenção e saúde no trabalho.",
    access: "Em breve",
  },
];
