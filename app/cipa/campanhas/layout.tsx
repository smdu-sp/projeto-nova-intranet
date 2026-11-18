import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campanhas Anteriores — CIPA SMUL",
  description: "Linha do tempo com os cartazes das campanhas realizadas pela CIPA SMUL",
};

export default function CampanhasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
