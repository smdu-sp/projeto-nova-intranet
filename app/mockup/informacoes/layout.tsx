import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informações e Documentos — CIPA SMUL",
  description: "Cartazes, legislação, mapa de risco, CAT, atas e materiais informativos da CIPA SMUL",
};

export default function InformacoesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
