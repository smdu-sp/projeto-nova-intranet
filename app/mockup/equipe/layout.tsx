import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Equipe e Integrantes — CIPA SMUL",
  description: "Integrantes da gestão atual, grupos de trabalho e ramais por coordenadoria da SMUL",
};

export default function EquipeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
