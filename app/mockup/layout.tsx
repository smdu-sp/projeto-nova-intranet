import type { Metadata } from "next";
import { Header } from "@/components/mockup/header";
import { Footer } from "@/components/mockup/footer";
import { AccessibilityBar } from "@/components/mockup/accessibility-bar";
import { BannerAlert } from "@/components/mockup/BannerAlert";

export const metadata: Metadata = {
  title: "CIPA SMUL — Prevenção de Acidentes e Assédio",
  description:
    "Comissão Interna de Prevenção de Acidentes e Assédio da Secretaria Municipal de Urbanismo e Licenciamento (SMUL)",
};

export default function MockupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd] text-gray-900">
      <AccessibilityBar />
      <Header />
      <BannerAlert />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

