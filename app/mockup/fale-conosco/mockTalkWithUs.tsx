import { Mailbox, MailIcon, Shield } from "lucide-react";
import { ReactNode } from "react";

export interface mockTalkWithUsProps {
  id: number;
  icon: ReactNode;
  title: string;
  description: string;
  isLink?: boolean;
  href?: string;
  variant?: "default" | "highlight";
}

export const mockTalkWithUs: mockTalkWithUsProps[] = [
  {
    id: 1,
    icon: <MailIcon size={18} className="text-gray-800" />,
    title: "E-mail oficial",
    description: "cipasmul@prefeitura.sp.gov.br",
    isLink: true,
    href: "mailto:cipasmul@prefeitura.sp.gov.br",
    variant: "default",
  },
  {
    id: 2,
    icon: <Mailbox size={18} className="text-pink-600" />,
    title: "Caixas de recado",
    description: "Temos caixas físicas junto às máquinas de café de cada andar, onde você pode depositar suas mensagens de forma anônima.",
    variant: "default",
  },
  {
    id: 3,
    icon: <Shield size={18} className="text-white" />,
    title: "Canal de acolhimento",
    description: 'Denúncias de assédio moral e sexual são tratadas com sigilo e acolhimento. Escreva para o e-mail acima com o assunto "Confidencial".',
    variant: "highlight",
  },
];
