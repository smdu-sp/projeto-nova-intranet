interface BoxesProps {
  id: number;
  title: string;
  description?: string;
  list?: string[];
}

export const Boxes: BoxesProps[] = [
  {
    id: 0,
    title: "O que é a CIPA ?",
    description: "É uma comissão de trabalho criada para promover ações voltadas à segurança e à saúde no ambiente de trabalho.",
  },
  {
    id: 1,
    title: "Qual é o objetivo da CIPA?",
    description: "Desenvolver atividade para:",
    list: ["Prevenção de acidentes de trabalho", "Prevenção de doenças profissionais", "Melhoria das condições de trabalho"],
  },
  {
    id: 2,
    title: "Para quem a CIPA atua?",
    description: "Em benefício dos servidores, promovendo um ambiente mais seguro e adequado para todos.",
  },
];
