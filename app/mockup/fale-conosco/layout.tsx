import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fale Conosco — CIPA SMUL",
  description: "Canais de atendimento, caixas de recado, acolhimento e diretoria da CIPA SMUL",
};

export default function FaleConoscoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
