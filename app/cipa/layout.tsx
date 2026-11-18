import type { Metadata } from "next";
import { Header } from "@/components/cipa/header";
import { Footer } from "@/components/cipa/footer";
import { AccessibilityBar } from "@/components/cipa/accessibility-bar";
import { BannerAlert } from "@/components/cipa/BannerAlert";
import { TempCampaignsProvider } from "@/components/cipa/temp-campaigns-provider";

export const metadata: Metadata = {
  title: "CIPA SMUL — Prevenção de Acidentes e Assédio",
  description:
    "Comissão Interna de Prevenção de Acidentes e Assédio da Secretaria Municipal de Urbanismo e Licenciamento (SMUL)",
};

export default function CipaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <TempCampaignsProvider>
      <div className="min-h-screen flex flex-col bg-[#fbfbfd] text-gray-900">
        <AccessibilityBar />
        <Header />
        <BannerAlert />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </TempCampaignsProvider>
  );
}

