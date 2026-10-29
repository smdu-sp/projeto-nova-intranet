import type { Metadata } from "next";
import "@/app/globals.css";
import { Header } from "@/components/mockup/header";
import { Footer } from "@/components/mockup/footer";
import { AccessibilityBar } from "@/components/mockup/accessibility-bar";
import { BannerAlert } from "@/components/mockup/BannerAlert";

export const metadata: Metadata = {
  title: "Reserva de Salas",
  description: "Sistema de reserva de salas de reunião",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <AccessibilityBar />
      <Header />
      <BannerAlert />
      <body className="antialiased">{children}</body>
      <Footer />
    </html>
  );
}
