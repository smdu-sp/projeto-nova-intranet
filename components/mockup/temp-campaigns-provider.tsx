"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { CampaignItem } from "@/app/mockup/campanhas/mockCampaigns";

interface TempCampaignsContextValue {
  tempCampaigns: CampaignItem[];
  latestTempCampaign: CampaignItem | null;
  addTempCampaign: (campaign: CampaignItem) => void;
  clearTempCampaigns: () => void;
}

const TempCampaignsContext = createContext<TempCampaignsContextValue>({
  tempCampaigns: [],
  latestTempCampaign: null,
  addTempCampaign: () => {},
  clearTempCampaigns: () => {},
});

export function TempCampaignsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tempCampaigns, setTempCampaigns] = useState<CampaignItem[]>([]);

  const addTempCampaign = useCallback((campaign: CampaignItem) => {
    setTempCampaigns((prev) => [campaign, ...prev]);
  }, []);

  const clearTempCampaigns = useCallback(() => {
    setTempCampaigns((prev) => {
      prev.forEach((c) => {
        c.images.forEach((img) => {
          if (img.desktopSrc.startsWith("blob:")) {
            URL.revokeObjectURL(img.desktopSrc);
          }
        });
      });
      return [];
    });
  }, []);

  return (
    <TempCampaignsContext.Provider
      value={{
        tempCampaigns,
        latestTempCampaign: tempCampaigns[0] ?? null,
        addTempCampaign,
        clearTempCampaigns,
      }}
    >
      {children}
    </TempCampaignsContext.Provider>
  );
}

export function useTempCampaigns() {
  return useContext(TempCampaignsContext);
}

