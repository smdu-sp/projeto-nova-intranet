"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Button } from "@/components/mockup/Button";

interface BannerAlertProps {
  message?: string;
  buttonTitle?: string;
  onButtonClick?: () => void;
}

export function BannerAlert({
  message = "Sofreu ou presenciou assédio moral ou sexual? Você não está sozinho(a).",
  buttonTitle = "Canal de denúncia e Acolhimento",
  onButtonClick,
}: BannerAlertProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      router.push("/mockup/eventos");
    }
  };

  return (
    <div className="banner-alert flex flex-col sm:flex-row gap-2 sm:gap-4 items-center justify-center bg-[#1f7a3d] px-4 py-2.5 sm:py-2 text-center">
      <span className="flex items-center justify-center gap-2 text-xs text-white font-bold">
        <TriangleAlert className="w-4 h-4 shrink-0 text-white" />
        <span>{message}</span>
      </span>
      <Button
        className="text-xs sm:text-sm font-bold bg-[#ffffff] text-[#1f7a3d] shrink-0"
        onClick={handleClick}
        title={buttonTitle}
        icon={<ArrowRight className="w-3.5 h-3.5 shrink-0" />}
      />
    </div>
  );
}
