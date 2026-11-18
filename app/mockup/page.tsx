"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  ImageIcon,
  Images,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Boxes } from "@/app/mockup/mockBoxes";
import {
  CAMPAIGN_MONTHS,
  type CampaignItem,
} from "@/app/mockup/campanhas/mockCampaigns";
import { Button } from "@/components/mockup/Button";
import {
  CampaignUploadModal,
  type CampaignUploadData,
} from "@/components/mockup/campaign-upload-modal";
import { useTempCampaigns } from "@/components/mockup/temp-campaigns-provider";
import { FastAcess } from "./mockFastAcess";

const DEFAULT_POSTER_URL = "/mockup/campanhas/30-9-2026/1.png";
const DEFAULT_POSTER_LABEL = "Segurança Elétrica — 30/09/2026";
const DEFAULT_POSTER_DESCRIPTION =
  "Atualizado periodicamente pela CIPA. Clique no quadro ao lado ou arraste novas imagens para cadastrar e substituir o cartaz em exibição — todos os cartazes anteriores permanecem organizados na linha do tempo de Campanhas.";

function formatIsoDatePtBr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export default function MockupHomePage() {
  const router = useRouter();
  const { latestTempCampaign, addTempCampaign, clearTempCampaigns } =
    useTempCampaigns();

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[] | undefined>(
    undefined
  );

  const preview =
    latestTempCampaign?.images[0]?.desktopSrc ?? DEFAULT_POSTER_URL;
  const posterTag = latestTempCampaign?.tag ?? "Destaque CIPA";
  const posterLabel = latestTempCampaign
    ? `${latestTempCampaign.title} — ${latestTempCampaign.dateFormatted}`
    : DEFAULT_POSTER_LABEL;
  const posterDescription =
    latestTempCampaign?.description ?? DEFAULT_POSTER_DESCRIPTION;
  const posterSlidesCount = latestTempCampaign?.images.length ?? 1;

  const handleOpenModal = (files?: File[]) => {
    setDroppedFiles(files && files.length > 0 ? files : undefined);
    setIsUploadModalOpen(true);
  };

  const handleDropOnCard = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    handleOpenModal(files);
  };

  const handleSaveCampaign = (data: CampaignUploadData) => {
    const [year, monthStr, dayStr] = data.date.split("-");
    const day = Number(dayStr) || 1;
    const monthNumber = Number(monthStr) || 1;
    const monthName = CAMPAIGN_MONTHS[monthNumber - 1] ?? "Setembro";
    const paddedDay = String(day).padStart(2, "0");
    const paddedMonth = String(monthNumber).padStart(2, "0");
    const dateFormatted = `${paddedDay}/${paddedMonth}/${year}`;

    const tempCampaign: CampaignItem = {
      id: `temp-${Date.now()}`,
      folderName: `${day}-${monthNumber}-${year}`,
      day,
      monthNumber,
      month: monthName,
      year: year || "2026",
      dateFormatted,
      dateLabel: `${paddedDay} de ${monthName}`,
      tag: data.tag,
      title: data.title,
      description: data.description,
      images: data.slides.map((slide, idx) => ({
        desktopSrc: slide.previewUrl,
        caption:
          slide.caption.trim() ||
          `Cartaz ${idx + 1} de ${data.slides.length} — ${dateFormatted}`,
        accessibleText: slide.accessibleText.trim() || undefined,
      })),
    };

    addTempCampaign(tempCampaign);
    setIsUploadModalOpen(false);
    setDroppedFiles(undefined);

    toast.success("Campanha publicada temporariamente!", {
      description:
        "Ela já aparece na linha do tempo de Campanhas (será limpa ao atualizar a página).",
    });
  };

  const handleRestoreDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTempCampaigns();
  };

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-6">
      {/* Seção Hero Institucional */}
      <div className="w-full flex flex-col gap-6 bg-white rounded-2xl py-8 mb-8 px-6 sm:px-8 border border-gray-200 shadow-sm">
        <section className="flex flex-col gap-3">
          <p className="text-[#1f7a3d] text-xs uppercase font-bold tracking-widest">
            Comissão Interna de Prevenção de Acidentes e Assédio
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            CIPA SMUL — Gestão 2026–2028
          </h1>
          <p className="text-base text-gray-600 max-w-[70ch]">
            Aqui na SMUL tem CIPA. Conheça quem somos, o que fazemos e como falar com a gente.
          </p>
        </section>

        <section
          aria-label="Sobre a CIPA"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
        >
          {Boxes.map(({ title, description, list, id }) => (
            <div
              key={id}
              className="flex flex-col gap-2.5 bg-[#f5f5f7] p-5 rounded-xl border border-gray-200/80"
            >
              <h2 className="font-bold text-base sm:text-lg text-gray-900">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {description}
                </p>
              )}
              {list && (
                <ul className="flex flex-col gap-1 list-disc pl-4 mt-1">
                  {list.map((item, key) => (
                    <li className="text-sm text-gray-700" key={key}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Destaque: Campanha do Mês */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 bg-white rounded-2xl py-8 mb-8 px-6 sm:px-8 border border-gray-200 shadow-sm">
        <section
          role="button"
          tabIndex={0}
          aria-label="Abrir modal para enviar fotos e dados da campanha do mês"
          onClick={() => handleOpenModal()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenModal();
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
          onDrop={handleDropOnCard}
          className={`relative flex flex-col items-center justify-center w-full sm:w-80 h-52 p-3 rounded-2xl cursor-pointer group transition-all shrink-0 border-2 ${
            isDraggingOver
              ? "bg-[#1f7a3d]/10 border-[#1f7a3d] border-dashed scale-[1.01]"
              : "bg-[#f5f5f7] border-transparent hover:border-[#1f7a3d]/40"
          }`}
        >
          {preview ? (
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black/5">
              <img
                src={preview}
                alt={
                  latestTempCampaign?.images[0]?.accessibleText?.trim() ||
                  `Cartaz do mês: ${posterLabel}`
                }
                className="w-full h-full object-contain rounded-xl"
              />
              {/* Texto sempre visível para indicar substituição / abertura do modal */}
              <div className="absolute inset-0 bg-black/55 group-hover:bg-black/65 transition-colors flex flex-col items-center justify-center gap-1.5 text-white p-3 text-center">
                <Upload className="w-6 h-6 drop-shadow" aria-hidden="true" />
                <span className="text-xs font-bold drop-shadow">
                  Clique ou arraste outra imagem para substituir
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 border border-dashed border-gray-400/80 rounded-xl p-4 group-hover:border-[#1f7a3d] transition-colors">
              <ImageIcon className="w-8 h-8 text-gray-500" aria-hidden="true" />
              <p className="text-sm text-gray-800 font-medium text-center">
                Clique ou arraste outra imagem para substituir
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a3d] bg-[#1f7a3d]/10 px-2.5 py-1 rounded-full">
              {posterTag}
            </span>
            {posterLabel && (
              <span className="text-xs text-gray-500 truncate max-w-sm">
                {posterLabel}
              </span>
            )}
            {posterSlidesCount > 1 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                <Images className="w-3 h-3" aria-hidden="true" />
                {posterSlidesCount} cartazes
              </span>
            )}
          </div>

          <h2 className="font-bold text-xl text-gray-900">Campanha do mês</h2>
          <p className="text-sm text-gray-600 max-w-[75ch] leading-relaxed">
            {posterDescription}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              className="bg-[#1f7a3d] hover:bg-[#196331] text-white font-bold px-4 py-2 text-xs shadow-sm"
              onClick={() => router.push("/mockup/campanhas")}
              title="Ver Campanhas Anteriores"
              icon={<ArrowRight size={14} />}
            />
            {latestTempCampaign && (
              <Button
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3.5 py-2 text-xs"
                onClick={handleRestoreDefault}
                title="Restaurar cartaz padrão"
                icon={<RotateCcw size={13} />}
              />
            )}
          </div>
        </section>
      </div>

      {/* Seção Acesso Rápido */}
      <section aria-label="Acesso Rápido" className="flex flex-col gap-4 py-4 mb-8">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-xl text-gray-900">Acesso Rápido</h2>
          <p className="text-xs text-gray-500">
            Navegue diretamente pelos conteúdos, canais e serviços da CIPA SMUL.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {FastAcess.map(({ title, subtitle, icon, url, id }) => (
            <Link
              href={url}
              key={id}
              className="group w-full h-full flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] rounded-xl"
            >
              <article className="w-full h-full flex flex-col justify-between p-5 gap-3 bg-white rounded-xl border border-gray-200 shadow-sm group-hover:border-[#1f7a3d]/60 group-hover:shadow-md transition-all">
                <div className="flex flex-col items-start gap-2.5">
                  <span className="p-2.5 rounded-lg bg-[#1f7a3d]/10 group-hover:bg-[#1f7a3d]/15 transition-colors">
                    {icon}
                  </span>
                  <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#1f7a3d] transition-colors">
                    {title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {subtitle}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1f7a3d] pt-1 group-hover:translate-x-0.5 transition-transform">
                  Acessar
                  <ArrowRight size={13} aria-hidden="true" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <CampaignUploadModal
        isOpen={isUploadModalOpen}
        initialFiles={droppedFiles}
        onClose={() => {
          setIsUploadModalOpen(false);
          setDroppedFiles(undefined);
        }}
        onSave={handleSaveCampaign}
      />
    </main>
  );
}
