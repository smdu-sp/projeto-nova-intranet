import fs from "fs";
import path from "path";
import { CampanhasClient } from "./campanhas-client";
import {
  CAMPAIGN_FOLDER_METADATA,
  CAMPAIGN_MONTHS,
  CampaignItem,
  fallbackCampaigns,
} from "./mockCampaigns";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);

function extractLeadingNumber(fileName: string): number {
  const base = path.parse(fileName).name;
  const parsed = Number.parseInt(base, 10);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function loadCampaignsFromPublic(): CampaignItem[] {
  const campaignsDir = path.join(process.cwd(), "public", "mockup", "campanhas");
  if (!fs.existsSync(campaignsDir)) {
    return fallbackCampaigns;
  }

  const entries = fs.readdirSync(campaignsDir, { withFileTypes: true });
  const campaigns: CampaignItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Espera pastas no formato D-M-AAAA ou DD-MM-AAAA (ex.: "9-9-2026", "30-9-2026")
    const match = entry.name.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) continue;

    const day = Number(match[1]);
    const monthNumber = Number(match[2]);
    const year = match[3];
    const monthName = CAMPAIGN_MONTHS[monthNumber - 1];

    if (!monthName || day < 1 || day > 31) continue;

    const folderPath = path.join(campaignsDir, entry.name);
    const imageFiles = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter(
        (file) =>
          file.isFile() && IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase())
      )
      .map((file) => file.name)
      .sort((a, b) => {
        const numA = extractLeadingNumber(a);
        const numB = extractLeadingNumber(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
      });

    if (imageFiles.length === 0) continue;

    const paddedDay = String(day).padStart(2, "0");
    const paddedMonth = String(monthNumber).padStart(2, "0");
    const dateFormatted = `${paddedDay}/${paddedMonth}/${year}`;
    const dateLabel = `${paddedDay} de ${monthName}`;
    const meta = CAMPAIGN_FOLDER_METADATA[entry.name];

    campaigns.push({
      id: entry.name,
      folderName: entry.name,
      day,
      monthNumber,
      month: monthName,
      year,
      dateFormatted,
      dateLabel,
      tag: meta?.tag ?? "Campanha CIPA",
      title: meta?.title ?? `Campanha de ${dateLabel} de ${year}`,
      description:
        meta?.description ??
        `Cartazes informativos publicados pela CIPA SMUL em ${dateFormatted}.`,
      images: imageFiles.map((fileName, idx) => {
        const fileNumber = extractLeadingNumber(fileName);
        const slideIndex = Number.isFinite(fileNumber) ? fileNumber : idx + 1;
        return {
          desktopSrc: `/mockup/campanhas/${entry.name}/${fileName}`,
          caption:
            meta?.captions?.[slideIndex] ??
            `Cartaz ${idx + 1} de ${imageFiles.length} — ${dateFormatted}`,
        };
      }),
    });
  }

  if (campaigns.length === 0) {
    return fallbackCampaigns;
  }

  return campaigns.sort((a, b) => {
    if (Number(a.year) !== Number(b.year)) return Number(b.year) - Number(a.year);
    if (a.monthNumber !== b.monthNumber) return b.monthNumber - a.monthNumber;
    return a.day - b.day;
  });
}

export default function CampanhasAnterioresPage() {
  const campaigns = loadCampaignsFromPublic();
  return <CampanhasClient campaigns={campaigns} />;
}
