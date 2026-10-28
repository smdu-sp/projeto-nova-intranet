import type { Metadata } from "next";
import { Header } from "@/components/mockup/header";
import { Footer } from "@/components/mockup/footer";
import { AccessibilityBar } from "@/components/mockup/accessibility-bar";
import { BannerAlert } from "@/components/mockup/banneralert";

export const metadata: Metadata = {
  title: "Campanhas Anteriores — CIPA SMUL",
  description: "Linha do tempo com os cartazes das campanhas realizadas pela CIPA SMUL",
};

export default function CampanhasLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd]">
      <AccessibilityBar />
      <Header />
      <BannerAlert />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

