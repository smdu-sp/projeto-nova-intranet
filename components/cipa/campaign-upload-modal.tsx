"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Eye, FileText, ImagePlus, Loader2, RefreshCw, Sparkles, Tag, Trash2, X } from "lucide-react";
import { extractTextFromPoster, summarizeCampaignFromSlides } from "@/lib/cipa/ocr-cartaz";

export type OcrStatus = "idle" | "processing" | "done" | "error";

export interface UploadedCampaignSlide {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  accessibleText: string;
  ocrStatus: OcrStatus;
  ocrProgress: number;
}

export interface CampaignUploadData {
  title: string;
  tag: string;
  date: string;
  description: string;
  slides: UploadedCampaignSlide[];
}

interface CampaignUploadModalProps {
  isOpen: boolean;
  initialFiles?: File[];
  onClose: () => void;
  onSave: (data: CampaignUploadData) => Promise<void> | void;
}

const SUGGESTED_TAGS = ["Prevenção de Acidentes", "Segurança Elétrica", "Saúde e Ergonomia", "Combate ao Assédio", "SIPAT", "Campanha CIPA"] as const;

const MONTHS_PT_BR = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDatePreview(isoDate: string): {
  formatted: string;
  label: string;
  year: string;
} {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return { formatted: isoDate, label: isoDate, year: "" };
  }
  const monthName = MONTHS_PT_BR[Number(month) - 1] ?? month;
  return {
    formatted: `${day}/${month}/${year}`,
    label: `${day} de ${monthName}`,
    year,
  };
}

export function CampaignUploadModal({ isOpen, initialFiles, onClose, onSave }: CampaignUploadModalProps) {
  const [step, setStep] = useState<"form" | "preview">("form");
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<string>(SUGGESTED_TAGS[0]);
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [description, setDescription] = useState("");
  const [isDescriptionManual, setIsDescriptionManual] = useState(false);
  const [slides, setSlides] = useState<UploadedCampaignSlide[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slidesRef = useRef<UploadedCampaignSlide[]>([]);

  slidesRef.current = slides;

  const runOcrForSlide = useCallback(async (slideId: string, file: File) => {
    setSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, ocrStatus: "processing", ocrProgress: 0 } : s)));

    try {
      const result = await extractTextFromPoster(file, (progress) => {
        setSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, ocrProgress: progress } : s)));
      });

      setSlides((prev) =>
        prev.map((s) => {
          if (s.id !== slideId) return s;
          return {
            ...s,
            ocrStatus: "done",
            ocrProgress: 100,
            accessibleText: result.text || s.accessibleText,
            caption: s.caption.trim() ? s.caption : result.suggestedCaption,
          };
        }),
      );
    } catch {
      setSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, ocrStatus: "error", ocrProgress: 0 } : s)));
    }
  }, []);

  const appendFiles = useCallback(
    (fileList: FileList | File[] | undefined | null) => {
      if (!fileList) return;
      const validFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
      if (validFiles.length === 0) {
        setError("Selecione apenas arquivos de imagem válidos (PNG, JPG, WebP, etc.).");
        return;
      }

      setError(null);
      const createdSlides: UploadedCampaignSlide[] = validFiles.map((file, index) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        accessibleText: "",
        ocrStatus: "processing",
        ocrProgress: 0,
      }));

      setSlides((prev) => [...prev, ...createdSlides]);

      // Processa o OCR em fila sequencial para não sobrecarregar o navegador com vários cartazes
      void (async () => {
        for (const slide of createdSlides) {
          await runOcrForSlide(slide.id, slide.file);
        }
      })();
    },
    [runOcrForSlide],
  );

  const resetModalState = useCallback(() => {
    setStep("form");
    setPreviewSlideIndex(0);
    setSlides([]);
    setTitle("");
    setTag(SUGGESTED_TAGS[0]);
    setDate(getTodayIsoDate());
    setDescription("");
    setIsDescriptionManual(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (isDescriptionManual) return;
    const extractedTexts = slides
      .map((s) => s.accessibleText)
      .filter((t) => t.trim().length > 0);
    if (extractedTexts.length === 0) return;

    const summary = summarizeCampaignFromSlides(extractedTexts);
    if (summary) {
      setDescription(summary);
    }
  }, [slides, isDescriptionManual]);

  const handleGenerateSummaryFromSlides = () => {
    const extractedTexts = slides
      .map((s) => s.accessibleText)
      .filter((t) => t.trim().length > 0);
    if (extractedTexts.length === 0) return;

    const summary = summarizeCampaignFromSlides(extractedTexts);
    if (summary) {
      setDescription(summary);
      setIsDescriptionManual(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialFiles && initialFiles.length > 0) {
      appendFiles(initialFiles);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        slidesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        resetModalState();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, initialFiles, appendFiles, resetModalState, onClose]);

  const handleClose = () => {
    slidesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    resetModalState();
    onClose();
  };

  const handleRemoveSlide = (id: string) => {
    setSlides((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  };

  const handleMoveSlide = (index: number, direction: -1 | 1) => {
    setSlides((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const handleSlideFieldChange = (id: string, field: "caption" | "accessibleText", value: string) => {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Informe o título da campanha.");
      return;
    }
    if (!tag.trim()) {
      setError("Informe ou selecione a categoria/tag da campanha.");
      return;
    }
    if (!date) {
      setError("Informe a data de publicação da campanha.");
      return;
    }
    if (!description.trim()) {
      setError("Informe uma descrição para a campanha.");
      return;
    }
    if (slides.length === 0) {
      setError("Adicione pelo menos uma foto/cartaz para a campanha.");
      return;
    }

    setError(null);
    setPreviewSlideIndex(0);
    setStep("preview");
  };

  const handleApproveAndPublish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        tag: tag.trim(),
        date,
        description: description.trim(),
        slides,
      });
      resetModalState();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível publicar a campanha. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const dateInfo = formatDatePreview(date);
  const currentPreviewSlide = slides[previewSlideIndex] ?? slides[0];
  const hasMultipleSlides = slides.length > 1;
  const isAnyOcrProcessing = slides.some((s) => s.ocrStatus === "processing");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-campaign-modal-title"
      onClick={handleClose}
      className="campaign-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`campaign-popup-box w-full ${
          step === "preview" ? "max-w-4xl" : "max-w-2xl"
        } max-h-[92vh] bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden transition-all`}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a3d]">Nova Campanha / Cartaz do Mês</span>
              <span className="text-xs text-gray-300">•</span>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className={`px-2 py-0.5 rounded-full ${step === "form" ? "bg-[#1f7a3d] text-white" : "bg-gray-100 text-gray-600"}`}>1. Dados, fotos e OCR</span>
                <span className="text-gray-400">→</span>
                <span className={`px-2 py-0.5 rounded-full ${step === "preview" ? "bg-[#1f7a3d] text-white" : "bg-gray-100 text-gray-500"}`}>2. Pré-visualização obrigatória</span>
              </div>
            </div>

            <h2 id="upload-campaign-modal-title" className="text-lg sm:text-xl font-bold text-gray-900">
              {step === "form" ? "Enviar fotos e dados da campanha" : "Confira como a campanha será exibida"}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar modal de upload"
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ETAPA 1: Formulário */}
        {step === "form" ? (
          <form onSubmit={handleGoToPreview} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Título */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="campaign-title" className="text-xs font-bold text-gray-800">
                Título da campanha <span className="text-red-600">*</span>
              </label>
              <input
                id="campaign-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Segurança Elétrica — Prevenção de Riscos Elétricos"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30"
              />
            </div>

            {/* Data e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="campaign-date" className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1f7a3d]" aria-hidden="true" />
                  <span>
                    Data da campanha <span className="text-red-600">*</span>
                  </span>
                </label>
                <input
                  id="campaign-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="campaign-tag" className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#1f7a3d]" aria-hidden="true" />
                  <span>
                    Categoria / Tag <span className="text-red-600">*</span>
                  </span>
                </label>
                <select
                  id="campaign-tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30 cursor-pointer"
                >
                  {SUGGESTED_TAGS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="campaign-description" className="text-xs font-bold text-gray-800">
                  Descrição <span className="text-red-600">*</span>
                </label>
                {slides.some((s) => s.accessibleText.trim().length > 0) && (
                  <button
                    type="button"
                    onClick={handleGenerateSummaryFromSlides}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1f7a3d] bg-[#1f7a3d]/10 hover:bg-[#1f7a3d]/15 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" aria-hidden="true" />
                    <span>Gerar resumo das imagens</span>
                  </button>
                )}
              </div>
              <textarea
                id="campaign-description"
                rows={3}
                value={description}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setDescription(nextVal);
                  setIsDescriptionManual(nextVal.trim().length > 0);
                }}
                placeholder={
                  isAnyOcrProcessing
                    ? "Lendo os cartazes para gerar um resumo automático da descrição..."
                    : "Descreva os principais objetivos e orientações desta campanha (ou gere automaticamente a partir das imagens)..."
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30 resize-y"
              />
              {!isDescriptionManual && description.trim().length > 0 && (
                <p className="text-[11px] text-gray-500">
                  Resumo gerado automaticamente a partir do texto lido nas imagens — você pode editar livremente acima.
                </p>
              )}
            </div>

            {/* Upload de múltiplas fotos */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-gray-800">
                  Fotos / Cartazes da campanha <span className="text-red-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">
                    {slides.length} {slides.length === 1 ? "imagem selecionada" : "imagens selecionadas"}
                  </span>
                  {slides.length > 0 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1f7a3d] bg-[#1f7a3d]/10 hover:bg-[#1f7a3d]/15 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      <ImagePlus className="w-3 h-3" aria-hidden="true" />
                      <span>Adicionar mais fotos</span>
                    </button>
                  )}
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                  appendFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  slides.length > 0 ? "p-4" : "p-6"
                } ${
                  isDraggingOver ? "border-[#1f7a3d] bg-[#1f7a3d]/10" : "border-gray-300 bg-[#f5f5f7] hover:border-[#1f7a3d]/70"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    appendFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <ImagePlus className="w-7 h-7 text-[#1f7a3d]" aria-hidden="true" />
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  {slides.length > 0
                    ? "Clique ou arraste mais imagens para adicionar à campanha"
                    : "Clique para selecionar várias imagens (Ctrl/Shift) ou arraste-as aqui"}
                </p>
                <p className="text-[11px] text-gray-500">
                  Você pode adicionar quantos cartazes quiser (um por vez ou vários juntos). O OCR lerá os textos automaticamente.
                </p>
              </div>

              {/* Lista de cartazes adicionados com leitura OCR */}
              {slides.length > 0 && (
                <div className="flex flex-col gap-3 mt-2">
                  {slides.map((slide, index) => (
                    <div key={slide.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-[#f5f5f7] border border-gray-200 shrink-0">
                          <img src={slide.previewUrl} alt={`Prévia do cartaz ${index + 1}`} className="w-full h-full object-contain" />
                          <span className="absolute top-1 left-1 text-[10px] font-bold bg-[#1f7a3d] text-white px-1.5 py-0.5 rounded-full">{index === 0 ? "Capa" : `#${index + 1}`}</span>
                        </div>

                        <div className="flex-1 w-full flex flex-col gap-2 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-800 truncate max-w-xs">{slide.file.name}</p>

                            <div className="flex items-center gap-1.5" role="status">
                              {slide.ocrStatus === "processing" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#1f7a3d]/10 text-[#1f7a3d] px-2.5 py-0.5 rounded-full">
                                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                  Lendo texto ({slide.ocrProgress}%)
                                </span>
                              )}
                              {slide.ocrStatus === "done" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-50 text-[#1f7a3d] px-2.5 py-0.5 rounded-full">
                                  <FileText className="w-3 h-3" aria-hidden="true" />
                                  Texto extraído via OCR
                                </span>
                              )}
                              {slide.ocrStatus === "error" && <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full">Não foi possível ler o texto</span>}
                              <button
                                type="button"
                                onClick={() => void runOcrForSlide(slide.id, slide.file)}
                                disabled={slide.ocrStatus === "processing"}
                                title="Reprocessar leitura OCR da imagem"
                                aria-label={`Reprocessar OCR do cartaz ${index + 1}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full disabled:opacity-40 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                                <span>Reprocessar</span>
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={slide.caption}
                            onChange={(e) => handleSlideFieldChange(slide.id, "caption", e.target.value)}
                            placeholder={`Legenda opcional do cartaz ${index + 1}`}
                            aria-label={`Legenda do cartaz ${index + 1}`}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30"
                          />
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(index, -1)}
                            disabled={index === 0}
                            aria-label={`Mover cartaz ${index + 1} para cima`}
                            className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(index, 1)}
                            disabled={index === slides.length - 1}
                            aria-label={`Mover cartaz ${index + 1} para baixo`}
                            className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlide(slide.id)}
                            aria-label={`Remover cartaz ${index + 1}`}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Campo de texto alternativo / transcrição OCR editável */}
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`accessible-text-${slide.id}`} className="text-[11px] font-bold text-gray-700">
                          Texto alternativo / Transcrição para acessibilidade (leitores de tela)
                        </label>
                        <textarea
                          id={`accessible-text-${slide.id}`}
                          rows={3}
                          value={slide.accessibleText}
                          onChange={(e) => handleSlideFieldChange(slide.id, "accessibleText", e.target.value)}
                          placeholder={
                            slide.ocrStatus === "processing"
                              ? "Extraindo texto do cartaz automaticamente..."
                              : "Revise o texto extraído pelo OCR ou descreva o conteúdo do cartaz para pessoas com deficiência visual..."
                          }
                          className="w-full rounded-lg border border-gray-300 bg-[#fbfbfd] px-3 py-2 text-xs text-gray-800 focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30 resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé de ações da Etapa 1 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-auto">
              <span className="text-[11px] text-gray-500">{isAnyOcrProcessing ? "Leitura OCR em andamento em segundo plano..." : "Revise os textos extraídos antes de avançar."}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleClose} className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-full transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 text-xs font-bold bg-[#1f7a3d] hover:bg-[#196331] text-white px-5 py-2.5 rounded-full shadow-sm transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Visualizar antes de postar</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ETAPA 2: Pré-visualização obrigatória */
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
              >
                {error}
              </div>
            )}

            <div className="rounded-xl border border-[#1f7a3d]/30 bg-[#1f7a3d]/5 px-4 py-3 text-xs text-gray-700">
              Confira abaixo como o pop-up da campanha ficará para os usuários, incluindo o texto de acessibilidade extraído. Caso encontre algum erro, clique em <strong>Voltar e corrigir</strong>.
            </div>

            {/* Simulação fiel do Modal de Campanha */}
            {currentPreviewSlide && (
              <div className="rounded-2xl border border-gray-200 bg-[#fbfbfd] shadow-sm overflow-hidden flex flex-col">
                {/* Cabeçalho simulado */}
                <div className="flex flex-col gap-1 px-5 py-3.5 bg-white border-b border-gray-100">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-bold text-[#1f7a3d] whitespace-nowrap">
                      {dateInfo.formatted}
                      {dateInfo.year && (
                        <span className="hidden sm:inline">
                          {" "}
                          ({dateInfo.label} de {dateInfo.year})
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{tag}</span>
                    {hasMultipleSlides && (
                      <span className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {previewSlideIndex + 1} / {slides.length}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">{title}</h3>
                </div>

                {/* Palco do Carrossel simulado */}
                <div className="relative flex items-center justify-center p-4 sm:p-6 bg-[#fbfbfd]">
                  {hasMultipleSlides && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
                      }}
                      aria-label="Cartaz anterior na prévia"
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-md cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  <div className="relative w-full max-w-xl aspect-video rounded-2xl overflow-hidden bg-[#eaf6f6] shadow-sm flex items-center justify-center">
                    <img
                      src={currentPreviewSlide.previewUrl}
                      alt=""
                      aria-hidden="true"
                      className="campaign-ambient-bg absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
                    />
                    <img
                      src={currentPreviewSlide.previewUrl}
                      alt={
                        currentPreviewSlide.accessibleText.trim() ||
                        `${title} — Cartaz ${previewSlideIndex + 1}`
                      }
                      className="relative z-10 w-full h-full object-contain"
                    />
                  </div>

                  {hasMultipleSlides && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
                      }}
                      aria-label="Próximo cartaz na prévia"
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-md cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Rodapé simulado */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 bg-white border-t border-gray-100">
                  <p className="text-xs text-gray-600 text-center sm:text-left">
                    {currentPreviewSlide.caption.trim() || `Cartaz ${previewSlideIndex + 1} de ${slides.length} — ${dateInfo.formatted}`}
                  </p>

                  {hasMultipleSlides && (
                    <div className="flex items-center gap-2 shrink-0">
                      {slides.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          aria-label={`Ir para cartaz ${idx + 1} na prévia`}
                          onClick={() => {
                            setPreviewSlideIndex(idx);
                          }}
                          className={`campaign-carousel-dot h-2.5 rounded-full transition-all cursor-pointer ${idx === previewSlideIndex ? "w-7 bg-[#1f7a3d]" : "w-2.5 bg-gray-300 hover:bg-gray-400"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumo da descrição do card */}
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Descrição exibida na linha do tempo e no destaque</span>
              <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
            </div>

            {/* Rodapé de ações da Etapa 2 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-auto">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="inline-flex items-center gap-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Voltar e corrigir</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs font-bold bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleApproveAndPublish()}
                  disabled={isAnyOcrProcessing || isSubmitting}
                  className="inline-flex items-center gap-2 text-xs font-bold bg-[#1f7a3d] hover:bg-[#196331] text-white px-5 py-2.5 rounded-full shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Publicando..."
                      : "Aprovar e postar campanha"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
