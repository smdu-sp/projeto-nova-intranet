export interface CampaignSlide {
  /** Caminho da imagem em `public/` */
  desktopSrc: string;
  /** Opcional: arte dedicada para mobile */
  mobileSrc?: string;
  caption?: string;
}

export interface CampaignItem {
  id: string;
  folderName: string;
  day: number;
  monthNumber: number;
  month: string;
  year: string;
  /** Ex.: "09/09/2026" */
  dateFormatted: string;
  /** Ex.: "09 de Setembro" */
  dateLabel: string;
  tag: string;
  title: string;
  description: string;
  images: CampaignSlide[];
}

export const CAMPAIGN_MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const CAMPAIGN_YEARS = ["2026", "2025"] as const;

export interface CampaignFolderMeta {
  tag: string;
  title: string;
  description: string;
  captions?: Record<number, string>;
}

/**
 * Metadados descritivos opcionais para cada pasta de data em `public/mockup/campanhas/<dia>-<mes>-<ano>`.
 * Se uma nova pasta de data for adicionada sem entrada aqui, ela ainda será exibida automaticamente
 * usando a data da pasta e a ordem numérica dos arquivos.
 */
export const CAMPAIGN_FOLDER_METADATA: Record<string, CampaignFolderMeta> = {
  "9-9-2026": {
    tag: "Prevenção de Acidentes",
    title: "Prevenção de Quedas e Acidentes em Ambientes de Escritório",
    description:
      "Orientações sobre fatores ambientais, físicos, humanos e organizacionais para evitar quedas, tropeços e escorregões no dia a dia.",
    captions: {
      1: "Cartaz 1 — Causas de acidentes de trabalho em ambientes de escritório",
      2: "Cartaz 2 — Fatores ambientais e físicos: fios e cabos expostos",
      3: "Cartaz 3 — Fatores ambientais e físicos: pisos molhados ou escorregadios",
      4: "Cartaz 4 — Fatores ambientais e físicos: obstáculos nos locais de passagem",
      5: "Cartaz 5 — Fatores humanos e organizacionais: atenção em desníveis e degraus",
      6: "Cartaz 6 — Fatores humanos e organizacionais: uso adequado de escadas em vez de cadeiras",
      7: "Cartaz 7 — Contato da CIPA SMUL: juntos construindo ambientes mais seguros",
    },
  },
  "30-9-2026": {
    tag: "Segurança Elétrica",
    title: "Segurança Elétrica — Prevenção de Riscos Elétricos",
    description:
      "Cuidados essenciais ao desligar equipamentos, manusear tomadas pelo plug, evitar sobrecarga em extensões e respeitar pontos exclusivos de ventiladores.",
    captions: {
      1: "Cartaz 1 — Desligar equipamentos não utilizados e retirar da tomada sempre pelo plug",
      2: "Cartaz 2 — Cuidados com mãos molhadas, sobrecarga de extensões e tomadas de ventiladores",
    },
  },
};

export const fallbackCampaigns: CampaignItem[] = [
  {
    id: "9-9-2026",
    folderName: "9-9-2026",
    day: 9,
    monthNumber: 9,
    month: "Setembro",
    year: "2026",
    dateFormatted: "09/09/2026",
    dateLabel: "09 de Setembro",
    tag: CAMPAIGN_FOLDER_METADATA["9-9-2026"].tag,
    title: CAMPAIGN_FOLDER_METADATA["9-9-2026"].title,
    description: CAMPAIGN_FOLDER_METADATA["9-9-2026"].description,
    images: [1, 2, 3, 4, 5, 6, 7].map((num) => ({
      desktopSrc: `/mockup/campanhas/9-9-2026/${num}.jpg`,
      caption: CAMPAIGN_FOLDER_METADATA["9-9-2026"].captions?.[num],
    })),
  },
  {
    id: "30-9-2026",
    folderName: "30-9-2026",
    day: 30,
    monthNumber: 9,
    month: "Setembro",
    year: "2026",
    dateFormatted: "30/09/2026",
    dateLabel: "30 de Setembro",
    tag: CAMPAIGN_FOLDER_METADATA["30-9-2026"].tag,
    title: CAMPAIGN_FOLDER_METADATA["30-9-2026"].title,
    description: CAMPAIGN_FOLDER_METADATA["30-9-2026"].description,
    images: [1, 2].map((num) => ({
      desktopSrc: `/mockup/campanhas/30-9-2026/${num}.png`,
      caption: CAMPAIGN_FOLDER_METADATA["30-9-2026"].captions?.[num],
    })),
  },
];
