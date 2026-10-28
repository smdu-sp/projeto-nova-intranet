"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, ImageIcon, X, ZoomIn } from "lucide-react";
import PreviousPage from "@/components/mockup/previouspage";
import { CampaignItem, mockCampaigns } from "./mockCampaigns";

function PosterPreview({
  campaign,
  inModal = false,
}: {
  campaign: CampaignItem;
  inModal?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [campaign.imageSrc]);

  if (!campaign.imageSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 bg-[#f5f5f7] select-none ${
          inModal
            ? "w-[82vw] max-w-[460px] aspect-[3/4] rounded-2xl p-8 gap-4 shadow-2xl"
            : "w-full aspect-[3/4] rounded-xl p-4 gap-2"
        }`}
      >
        <ImageIcon className={inModal ? "w-12 h-12 text-gray-400" : "w-7 h-7 text-gray-400"} />
        <span className="text-xs uppercase font-bold tracking-wider text-[#1f7a3d]">
          {campaign.month} · {campaign.year}
        </span>
        <p className={`font-bold text-gray-800 ${inModal ? "text-lg" : "text-xs line-clamp-2"}`}>
          {campaign.title}
        </p>
        <p className="text-[11px] text-gray-500 break-all px-2">
          Cartaz pendente em <code className="font-mono">public{campaign.imageSrc}</code>
        </p>
      </div>
    );
  }

  return (
    <img
      src={campaign.imageSrc}
      alt={`Cartaz da campanha ${campaign.title} (${campaign.month} de ${campaign.year})`}
      onError={() => setHasError(true)}
      className={
        inModal
          ? "max-h-[80vh] max-w-[90vw] w-auto h-auto object-contain rounded-2xl shadow-2xl"
          : "w-full aspect-[3/4] object-cover rounded-xl"
      }
    />
  );
}

export default function CampanhasAnterioresPage() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedCampaign = selectedIndex !== null ? mockCampaigns[selectedIndex] : null;

  const closeModal = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const showPrev = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return prev === 0 ? mockCampaigns.length - 1 : prev - 1;
    });
  }, []);

  const showNext = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return prev === mockCampaigns.length - 1 ? 0 : prev + 1;
    });
  }, []);

  useEffect(() => {
    if (selectedIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, closeModal, showPrev, showNext]);

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PreviousPage />

      <div className="flex flex-col gap-2 py-4 mb-6">
        <h1 className="text-3xl font-bold">Campanhas anteriores</h1>
        <p className="text-sm text-gray-500 max-w-[65ch]">
          Acompanhe a linha do tempo com os cartazes e ações mensais da CIPA SMUL. Clique em qualquer cartaz para visualizá-lo em destaque.
        </p>
      </div>

      {/* Linha do Tempo */}
      <section aria-label="Linha do tempo de campanhas" className="relative py-4 mb-12">
        {/* Eixo vertical (à esquerda no mobile, centralizado no desktop) */}
        <div
          aria-hidden="true"
          className="campaign-timeline-line absolute top-0 bottom-0 left-4 md:left-1/2 md:-translate-x-1/2 w-0.5 bg-[#1f7a3d]/25"
        />

        <ol className="flex flex-col gap-10">
          {mockCampaigns.map((campaign, index) => {
            const isLeft = index % 2 === 0;

            return (
              <li
                key={campaign.id}
                className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-6 md:gap-12 pl-12 md:pl-0"
              >
                {/* Marcador na linha do tempo */}
                <div
                  aria-hidden="true"
                  className="campaign-timeline-dot absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#1f7a3d] ring-4 ring-white shadow-sm z-10"
                />

                {/* Coluna do Card (alterna entre esquerda e direita no desktop) */}
                <div className={isLeft ? "md:col-start-1 md:pr-4" : "md:col-start-2 md:pl-4"}>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`Ampliar cartaz de ${campaign.month} de ${campaign.year}: ${campaign.title}`}
                    className="w-full text-left group bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[#1f7a3d]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] transition-all cursor-pointer flex flex-col sm:flex-row gap-5 items-center sm:items-stretch"
                  >
                    {/* Miniatura do Cartaz */}
                    <div className="relative w-44 sm:w-36 shrink-0 overflow-hidden rounded-xl">
                      <PosterPreview campaign={campaign} />
                      <div className="campaign-zoom-overlay absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <span className="inline-flex items-center gap-1.5 bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                          <ZoomIn className="w-3.5 h-3.5" />
                          Ampliar
                        </span>
                      </div>
                    </div>

                    {/* Detalhes da Campanha */}
                    <div className="flex flex-col justify-between flex-1 gap-3 py-1">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1f7a3d] bg-[#1f7a3d]/10 px-2.5 py-1 rounded-full">
                            <Calendar className="w-3 h-3" />
                            {campaign.month} · {campaign.year}
                          </span>
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {campaign.tag}
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-gray-900 group-hover:text-[#1f7a3d] transition-colors">
                          {campaign.title}
                        </h2>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {campaign.description}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1f7a3d] mt-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Clique para ver o cartaz
                      </span>
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Modal com Blur no Fundo e Foco Total no Cartaz */}
      {selectedCampaign && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Cartaz em destaque: ${selectedCampaign.title}`}
          onClick={closeModal}
          className="campaign-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-md transition-all"
        >
          {/* Botão Fechar */}
          <button
            type="button"
            onClick={closeModal}
            aria-label="Fechar visualização do cartaz"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navegação Anterior */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            aria-label="Cartaz anterior"
            className="hidden sm:flex absolute left-4 lg:left-8 z-20 p-3 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Container Central do Cartaz */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="campaign-modal-content relative flex flex-col items-center max-w-3xl gap-3"
          >
            <PosterPreview campaign={selectedCampaign} inModal />

            <div className="text-center px-4 py-2 rounded-full bg-black/60 text-white backdrop-blur-sm">
              <p className="text-xs sm:text-sm font-bold text-white">
                {selectedCampaign.month} de {selectedCampaign.year} — {selectedCampaign.title}
              </p>
            </div>
          </div>

          {/* Navegação Próximo */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            aria-label="Próximo cartaz"
            className="hidden sm:flex absolute right-4 lg:right-8 z-20 p-3 rounded-full bg-white/90 hover:bg-white text-gray-900 shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </main>
  );
}

