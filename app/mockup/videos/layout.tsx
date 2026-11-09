import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vídeos Educativos — CIPA SMUL",
  description: "Conteúdos em vídeo produzidos pela CIPA SMUL com recursos de acessibilidade",
};

export default function VideosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
