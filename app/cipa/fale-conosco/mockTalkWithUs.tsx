import { Mailbox, MailIcon, Shield } from "lucide-react";
import { ReactNode } from "react";
import { mockPeople } from "@/app/cipa/equipe/mockPeople";

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
    description: "Temos caixas físicas junto às máquinas de café de cada andar, onde você pode depositar suas sugestões, dúvidas ou relatos de forma anônima.",
    variant: "default",
  },
  {
    id: 3,
    icon: <Shield size={18} className="text-white" />,
    title: "Canal de acolhimento",
    description: 'Denúncias de assédio moral e sexual são tratadas com absoluto sigilo e acolhimento. Escreva para o e-mail oficial com o assunto "Confidencial".',
    actionLabel: 'Escrever com assunto "Confidencial"',
    href: `mailto:${CIPA_OFFICIAL_EMAIL}?subject=Confidencial%20%E2%80%94%20Canal%20de%20Acolhimento%20CIPA`,
    variant: "highlight",
  },
];

const DIRECTOR_ORDER = ["Presidente", "Vice-Presidente", "1ª Secretária", "2º Secretário"];

export const mockDirectors: DirectorProps[] = mockPeople
  .filter((person) => Boolean(person.role && person.role !== "—"))
  .sort((a, b) => {
    const idxA = DIRECTOR_ORDER.indexOf(a.role ?? "");
    const idxB = DIRECTOR_ORDER.indexOf(b.role ?? "");
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  })
  .map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role ?? "",
    unit: person.unit ?? "SMUL",
    position: `${person.role} · ${person.unit ?? "SMUL"}`,
  }));
