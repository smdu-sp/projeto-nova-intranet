import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parcerias e Ações — CIPA SMUL",
  description: "Atividades, oficinas e práticas integrativas apoiadas pela CIPA SMUL",
};

export default function ParceriasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
