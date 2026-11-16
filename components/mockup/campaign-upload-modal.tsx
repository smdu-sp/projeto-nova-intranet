"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ImagePlus,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export interface UploadedCampaignSlide {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
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
  onSave: (data: CampaignUploadData) => void;
}

const SUGGESTED_TAGS = [
  "Prevenção de Acidentes",
  "Segurança Elétrica",
  "Saúde e Ergonomia",
  "Combate ao Assédio",
  "SIPAT",
  "Campanha CIPA",
] as const;

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CampaignUploadModal({
  isOpen,
  initialFiles,
  onClose,
  onSave,
}: CampaignUploadModalProps) {
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<string>(SUGGESTED_TAGS[0]);
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [description, setDescription] = useState("");
  const [slides, setSlides] = useState<UploadedCampaignSlide[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slidesRef = useRef<UploadedCampaignSlide[]>([]);

  slidesRef.current = slides;

  const appendFiles = (fileList: FileList | File[] | undefined | null) => {
    if (!fileList) return;
    const validFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );
    if (validFiles.length === 0) {
      setError("Selecione apenas arquivos de imagem válidos (PNG, JPG, WebP, etc.).");
      return;
    }

    setError(null);
    setSlides((prev) => {
      const next = validFiles.map((file, index) => ({
        id: `${Date.now()}-${prev.length + index}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      }));
      return [...prev, ...next];
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialFiles && initialFiles.length > 0) {
      appendFiles(initialFiles);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, initialFiles, onClose]);

  const handleClose = () => {
    slidesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSlides([]);
    setTitle("");
    setTag(SUGGESTED_TAGS[0]);
    setDate(getTodayIsoDate());
    setDescription("");
    setError(null);
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

  const handleCaptionChange = (id: string, caption: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, caption } : s))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    onSave({
      title: title.trim(),
      tag: tag.trim(),
      date,
      description: description.trim(),
      slides,
    });

    setSlides([]);
    setTitle("");
    setTag(SUGGESTED_TAGS[0]);
    setDate(getTodayIsoDate());
    setDescription("");
    setError(null);
  };

  if (!isOpen) return null;

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
        className="campaign-popup-box w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a3d]">
              Nova Campanha / Cartaz do Mês
            </span>
            <h2
              id="upload-campaign-modal-title"
              className="text-lg sm:text-xl font-bold text-gray-900"
            >
              Enviar fotos e dados da campanha
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

        {/* Formulário com rolagem */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
            >
              {error}
            </div>
          )}

          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="campaign-title"
              className="text-xs font-bold text-gray-800"
            >
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
              <label
                htmlFor="campaign-date"
                className="text-xs font-bold text-gray-800 flex items-center gap-1.5"
              >
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
              <label
                htmlFor="campaign-tag"
                className="text-xs font-bold text-gray-800 flex items-center gap-1.5"
              >
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
            <label
              htmlFor="campaign-description"
              className="text-xs font-bold text-gray-800"
            >
              Descrição <span className="text-red-600">*</span>
            </label>
            <textarea
              id="campaign-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os principais objetivos e orientações desta campanha..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30 resize-y"
            />
          </div>

          {/* Upload de múltiplas fotos */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-gray-800">
                Fotos / Cartazes da campanha <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-gray-500">
                {slides.length}{" "}
                {slides.length === 1 ? "imagem selecionada" : "imagens selecionadas"}
              </span>
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
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? "border-[#1f7a3d] bg-[#1f7a3d]/10"
                  : "border-gray-300 bg-[#f5f5f7] hover:border-[#1f7a3d]/70"
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
                Clique ou arraste uma ou mais imagens aqui
              </p>
              <p className="text-[11px] text-gray-500">
                Formatos aceitos: PNG, JPG, JPEG, WebP. A primeira imagem será exibida como capa.
              </p>
            </div>

            {/* Lista de cartazes adicionados */}
            {slides.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-[#f5f5f7] border border-gray-200 shrink-0">
                      <img
                        src={slide.previewUrl}
                        alt={`Prévia do cartaz ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-1 left-1 text-[10px] font-bold bg-[#1f7a3d] text-white px-1.5 py-0.5 rounded-full">
                        {index === 0 ? "Capa" : `#${index + 1}`}
                      </span>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-1.5 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {slide.file.name}
                      </p>
                      <input
                        type="text"
                        value={slide.caption}
                        onChange={(e) =>
                          handleCaptionChange(slide.id, e.target.value)
                        }
                        placeholder={`Legenda opcional do cartaz ${index + 1} (ex.: Orientações gerais)`}
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
                ))}
              </div>
            )}
          </div>

          {/* Rodapé de ações */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-auto">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-xs font-bold bg-[#1f7a3d] hover:bg-[#196331] text-white px-5 py-2.5 rounded-full shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Publicar campanha</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

