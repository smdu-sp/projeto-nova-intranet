import { Clapperboard, Folder, Handshake, MessageCircle, UsersRound } from "lucide-react";

interface FastAcessProps {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  url: string;
}

export const FastAcess: FastAcessProps[] = [
  {
    id: 1,
    title: "Quer falar com a gente ?",
    subtitle: "E-mails, caixas de recado e canal de acolihmento",
    icon: <MessageCircle className="text-gray-500" size={16} />,
    url: "/mockup/eventos",
  },
  {
    id: 2,
    title: "Temos bastante informação para compartilhar",
    subtitle: "Cartazes, legislação, mapa de risco e mais",
    icon: <Folder className="text-gray-500" size={16} />,
    url: "/mockup/informacoes",
  },
  {
    id: 3,
    title: "Venha assistir nossos vídeos",
    subtitle: "Conteúdos em vídeo produzidos pela CIPA",
    icon: <Clapperboard className="text-gray-500" size={16} />,
    url: "/mockup/videos",
  },
  {
    id: 4,
    title: "Conheça os nossos integrantes",
    subtitle: "Gestõ, grupos de trabalho e contatos",
    icon: <UsersRound className="text-gray-500" size={16} />,
    url: "/mockup/integrantes",
  },
  {
    id: 5,
    title: "Somos parceiros e apoiamos as ações",
    subtitle: "Atividades de outros departamentos em parceria com a CIPA",
    icon: <Handshake className="text-gray-500" size={16} />,
    url: "/mockup/parcerias",
  },
];
