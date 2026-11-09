export interface BoxesProps {
  id: number;
  title: string;
  description?: string;
  list?: string[];
}

export const Boxes: BoxesProps[] = [
  {
    id: 0,
    title: "O que é a CIPA?",
    description:
      "É uma comissão de trabalho criada para promover ações voltadas à segurança, à saúde e à prevenção ao assédio no ambiente de trabalho.",
  },
  {
    id: 1,
    title: "Qual é o objetivo da CIPA?",
    description: "Desenvolver atividades permanentes para:",
    list: [
      "Prevenção de acidentes de trabalho",
      "Prevenção de doenças profissionais",
      "Melhoria das condições e do clima de trabalho",
    ],
  },
  {
    id: 2,
    title: "Para quem a CIPA atua?",
    description:
      "Em benefício de todas as servidoras e servidores da SMUL, promovendo um ambiente mais seguro, acolhedor e adequado para todos.",
  },
];
