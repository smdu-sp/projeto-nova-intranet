"use client";

import type { Block, Word } from "tesseract.js";

export interface OcrExtractionResult {
  text: string;
  suggestedCaption: string;
}

export interface OcrExtractionOptions {
  /** Inverte cores do canvas para melhorar leitura de textos claros em fundos escuros */
  inverted?: boolean;
}

const VALID_SHORT_PT_WORDS = new Set([
  "a",
  "à",
  "e",
  "é",
  "o",
  "os",
  "as",
  "de",
  "do",
  "da",
  "em",
  "no",
  "na",
  "se",
  "ou",
  "um",
  "há",
  "ao",
  "sã",
]);

/**
 * Pré-processa a imagem em um canvas offscreen:
 * - Faz upscale de alta qualidade para pelo menos 2000px de largura (melhora leitura de fontes pequenas em cartazes)
 * - Mantém contraste limpo sem destruir textos em caixas coloridas
 * - Opcionalmente inverte as cores para faixas escuras com texto branco
 */
async function preprocessImageForOcr(
  file: File,
  options?: OcrExtractionOptions
): Promise<HTMLCanvasElement> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error("Não foi possível carregar a imagem para leitura OCR."));
      element.src = imageUrl;
    });

    const minTargetWidth = 2000;
    const scale =
      img.naturalWidth < minTargetWidth
        ? Math.min(2.5, Math.max(1.5, minTargetWidth / Math.max(1, img.naturalWidth)))
        : 1;

    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Contexto 2D indisponível para pré-processamento da imagem.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    if (options?.inverted) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function isReliableWord(word: Word): boolean {
  const cleaned = word.text.trim();
  if (!cleaned) return false;

  const alphaNum = cleaned.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]/g, "");
  if (alphaNum.length === 0) return false;

  // Palavras muito curtas ou símbolos isolados vindos de ilustrações exigem confiança alta
  if (alphaNum.length <= 2) {
    if (VALID_SHORT_PT_WORDS.has(alphaNum.toLowerCase())) {
      return word.confidence >= 45;
    }
    return word.confidence >= 78;
  }

  return word.confidence >= 42;
}

function cleanLineArtifacts(lineText: string): string {
  return lineText
    // Remove artefatos comuns de ícones/marcadores no início da linha (ex.: "= :", "|", "a\"")
    .replace(/^(?:[=|~•·\-–—"'`°ºª]+\s*)+/, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extrai e filtra linhas confiáveis a partir dos blocos estruturados do Tesseract.
 */
function extractReliableLines(blocks: Block[] | null, fallbackText: string): string {
  if (!blocks || blocks.length === 0) {
    return fallbackText
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(cleanLineArtifacts)
      .filter((line) => (line.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/g) ?? []).length >= 3)
      .join("\n");
  }

  const keptLines: string[] = [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const reliableWords = line.words.filter(isReliableWord);
        if (reliableWords.length === 0) continue;

        const avgConfidence =
          reliableWords.reduce((sum, w) => sum + w.confidence, 0) /
          reliableWords.length;

        if (avgConfidence < 50) continue;

        const joined = cleanLineArtifacts(
          reliableWords.map((w) => w.text.trim()).join(" ")
        );

        const alphaNumCount = (
          joined.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]/g) ?? []
        ).length;
        if (alphaNumCount < 3) continue;

        keptLines.push(joined);
      }
    }
  }

  return keptLines.join("\n");
}

function buildSuggestedCaption(cleanedText: string): string {
  if (!cleanedText) return "";
  const meaningfulLines = cleanedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 10);

  const summary = meaningfulLines.slice(0, 2).join(" — ");
  if (!summary) return "";
  if (summary.length <= 110) return summary;
  return `${summary.slice(0, 107).trimEnd()}...`;
}

const BOILERPLATE_PATTERNS = [
  /^aqui na smul$/i,
  /^tem cipa$/i,
  /^aqui na smul tem cipa$/i,
  /^prefeitura de/i,
  /^s[ãa]o paulo$/i,
  /^cipa smul$/i,
  /^cipasmul@/i,
];

/**
 * Gera um resumo coeso a partir dos textos extraídos (OCR) de todas as imagens da campanha.
 */
export function summarizeCampaignFromSlides(slideTexts: string[]): string {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const rawSlideText of slideTexts) {
    if (!rawSlideText.trim()) continue;

    // Agrupa quebras simples dentro de um mesmo bloco mantendo frases completas
    const normalized = rawSlideText
      .replace(/\r\n/g, "\n")
      .replace(/([a-zà-öø-ÿ,])\n([a-zà-öø-ÿ])/g, "$1 $2");

    const parts = normalized
      .split(/\n|(?<=[.!?:])\s+/)
      .map((part) => cleanLineArtifacts(part))
      .filter((part) => {
        if (part.length < 18) return false;
        if (BOILERPLATE_PATTERNS.some((rx) => rx.test(part))) return false;
        return true;
      });

    for (const part of parts) {
      const key = part.toLowerCase().replace(/[^a-zà-öø-ÿ0-9]/g, "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      candidates.push(part);
    }
  }

  if (candidates.length === 0) return "";

  const selected: string[] = [];
  let totalLength = 0;
  const maxSummaryLength = 300;

  for (const sentence of candidates) {
    const formatted = /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
    if (selected.length > 0 && totalLength + formatted.length + 1 > maxSummaryLength) {
      break;
    }
    selected.push(formatted);
    totalLength += formatted.length + 1;
    if (selected.length >= 3) break;
  }

  return selected.join(" ");
}

/**
 * Extrai texto em Português (por) de uma imagem de cartaz usando Tesseract.js no navegador,
 * utilizando modelo hospedado localmente em `/tessdata` (funciona 100% offline/intranet),
 * com segmentação para textos esparsos (PSM 11) e filtro por nível de confiança.
 */
export async function extractTextFromPoster(
  file: File,
  onProgress?: (progressPercent: number) => void,
  options?: OcrExtractionOptions
): Promise<OcrExtractionResult> {
  const { createWorker, PSM } = await import("tesseract.js");
  const preprocessedCanvas = await preprocessImageForOcr(file, options);

  const worker = await createWorker("por", 1, {
    langPath: "/tessdata",
    logger: (message) => {
      if (
        message.status === "recognizing text" &&
        typeof message.progress === "number"
      ) {
        onProgress?.(Math.round(message.progress * 100));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      user_defined_dpi: "300",
    });

    const { data } = await worker.recognize(
      preprocessedCanvas,
      {},
      { blocks: true, text: true }
    );

    const cleaned = extractReliableLines(data.blocks, data.text ?? "");
    return {
      text: cleaned,
      suggestedCaption: buildSuggestedCaption(cleaned),
    };
  } finally {
    await worker.terminate();
  }
}
