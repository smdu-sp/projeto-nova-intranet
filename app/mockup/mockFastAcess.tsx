import {
  Clapperboard,
  Folder,
  Handshake,
  Megaphone,
  MessageCircle,
  UsersRound,
} from "lucide-react";

export interface FastAcessProps {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  url: string;
}

export const FastAcess: FastAcessProps[] = [
  {
    id: 1,
    title: "Quer falar com a gente?",
    subtitle: "E-mails, caixas de recado e canal de acolhimento",
    icon: <MessageCircle className="text-[#1f7a3d]" size={18} />,
    url: "/mockup/fale-conosco",
  },
  {
    id: 2,
    title: "Temos bastante informação para compartilhar",
    subtitle: "Cartazes, legislação, mapa de risco, CAT e mais",
    icon: <Folder className="text-[#1f7a3d]" size={18} />,
    url: "/mockup/informacoes",
  },
  {
    id: 3,
    title: "Campanhas realizadas pela CIPA",
    subtitle: "Linha do tempo com os cartazes publicados por mês e ano",
    icon: <Megaphone className="text-[#1f7a3d]" size={18} />,
    url: "/mockup/campanhas",
  },
  {
    id: 4,
    title: "Venha assistir nossos vídeos",
    subtitle: "Conteúdos em vídeo produzidos pela CIPA com legendas",
    icon: <Clapperboard className="text-[#1f7a3d]" size={18} />,
    url: "/mockup/videos",
  },
  {
    id: 5,
    title: "Conheça os nossos integrantes",
    subtitle: "Gestão atual, grupos de trabalho e ramais por unidade",
    icon: <UsersRound className="text-[#1f7a3d]" size={18} />,
    url: "/mockup/equipe",
  },
  {
    id: 6,
    title: "Somos parceiros e apoiamos as ações",
    subtitle: "Atividades e práticas integrativas em parceria com a CIPA",
    icon: <Handshake className="text-[#1f7a3d]" size={18} />,
    url: "/mockup/parcerias",
  },
];
