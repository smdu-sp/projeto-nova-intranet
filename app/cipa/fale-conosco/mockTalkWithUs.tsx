import { Mailbox, MailIcon, Shield } from "lucide-react";
import { ReactNode } from "react";

export interface mockTalkWithUsProps {
  id: number;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  isLink?: boolean;
  href?: string;
  variant?: "default" | "highlight";
}

export interface DirectorProps {
  id: number;
  name: string;
  role: string;
  unit: string;
  position: string;
}

export const CIPA_OFFICIAL_EMAIL = "cipasmul@prefeitura.sp.gov.br";

export const mockTalkWithUs: mockTalkWithUsProps[] = [
  {
    id: 1,
    icon: <MailIcon size={18} className="text-[#1f7a3d]" />,
    title: "E-mail oficial",
    description: CIPA_OFFICIAL_EMAIL,
    actionLabel: "Enviar mensagem por e-mail",
    isLink: true,
    href: `mailto:${CIPA_OFFICIAL_EMAIL}`,
    variant: "default",
  },
  {
    id: 2,
    icon: <Mailbox size={18} className="text-pink-600" />,
    title: "Caixas de recado",
    description:
      "Temos caixas físicas junto às máquinas de café de cada andar, onde você pode depositar suas sugestões, dúvidas ou relatos de forma anônima.",
    variant: "default",
  },
  {
    id: 3,
    icon: <Shield size={18} className="text-white" />,
    title: "Canal de acolhimento",
    description:
      'Denúncias de assédio moral e sexual são tratadas com absoluto sigilo e acolhimento. Escreva para o e-mail oficial com o assunto "Confidencial".',
    actionLabel: 'Escrever com assunto "Confidencial"',
    href: `mailto:${CIPA_OFFICIAL_EMAIL}?subject=Confidencial%20%E2%80%94%20Canal%20de%20Acolhimento%20CIPA`,
    variant: "highlight",
  },
];

export const mockDirectors: DirectorProps[] = [
  {
    id: 1,
    name: "Leila Souza Petrini",
    role: "Presidente",
    unit: "PARHIS",
    position: "Presidente · PARHIS",
  },
  {
    id: 2,
    name: "Rosemeire de Almeida",
    role: "Vice-Presidente",
    unit: "GEOINFO",
    position: "Vice-presidente · GEOINFO",
  },
  {
    id: 3,
    name: "Analice Barbosa dos Santos",
    role: "1ª Secretária",
    unit: "CASE",
    position: "1ª secretária · CASE",
  },
  {
    id: 4,
    name: "Hélio Freitas Filho",
    role: "2º Secretário",
    unit: "SERVIN",
    position: "2º secretário · SERVIN",
  },
];
