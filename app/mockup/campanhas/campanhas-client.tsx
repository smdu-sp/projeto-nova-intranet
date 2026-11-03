"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Calendar,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Images,
  ImageIcon,
  X,
  ZoomIn,
} from "lucide-react";
import PreviousPage from "@/components/mockup/PreviousPage";
import {
  CAMPAIGN_MONTHS,
  CAMPAIGN_YEARS,
  CampaignItem,
  CampaignSlide,
} from "./mockCampaigns";

const MODAL_TRANSITION_MS = 280;

/**
 * Renderiza o cartaz da campanha mantendo o container sempre em:
 * - Mobile (< 768px): 9:16
 * - Desktop (>= 768px): 16:9
 * Usa `object-contain` com fundo suavemente desfocado para preservar 100% da leitura dos cartazes.
 */
function ResponsiveCampaignArt({
  slide,
  campaignTitle,
  dateBadge,
  inModal = false,
}: {
  slide: CampaignSlide;
  campaignTitle: string;
  dateBadge: string;
  inModal?: boolean;
}) {
  const [desktopError, setDesktopError] = useState(false);
  const [mobileError, setMobileError] = useState(false);

  const mobileSrc = slide.mobileSrc || slide.desktopSrc;

  useEffect(() => {
    setDesktopError(false);
    setMobileError(false);
  }, [slide.desktopSrc, slide.mobileSrc]);

  const sizeClasses = inModal
    ? "w-[min(100%,calc((82vh_-_11rem)*9/16))] md:w-[min(100%,calc((82vh_-_11rem)*16/9))] aspect-[9/16] md:aspect-video rounded-2xl shadow-md"
    : "w-full max-w-[260px] md:max-w-none mx-auto aspect-[9/16] md:aspect-video rounded-xl";

  return (
    <div className={`relative overflow-hidden bg-[#eaf6f6] select-none ${sizeClasses}`}>
      {/* Visualização Desktop (16:9) */}
      <div className="hidden md:flex relative w-full h-full items-center justify-center">
        {!slide.desktopSrc || desktopError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 bg-[#f5f5f7] p-6 gap-2">
            <ImageIcon className={inModal ? "w-11 h-11 text-gray-400" : "w-7 h-7 text-gray-400"} />
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#1f7a3d]">
              {dateBadge}
            </span>
            <p className={`font-bold text-gray-800 ${inModal ? "text-base" : "text-xs line-clamp-1"}`}>
              {slide.caption || campaignTitle}
            </p>
          </div>
        ) : (
          <>
            <img
              src={slide.desktopSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="campaign-ambient-bg absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
            />
            <img
              src={slide.desktopSrc}
              alt={slide.caption ? `${campaignTitle} — ${slide.caption}` : campaignTitle}
              draggable={false}
              onError={() => setDesktopError(true)}
              className="relative z-10 w-full h-full object-contain"
            />
          </>
        )}
      </div>

      {/* Visualização Mobile (9:16) */}
      <div className="flex md:hidden relative w-full h-full items-center justify-center">
        {!mobileSrc || mobileError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 bg-[#f5f5f7] p-5 gap-2.5">
            <ImageIcon className={inModal ? "w-10 h-10 text-gray-400" : "w-7 h-7 text-gray-400"} />
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#1f7a3d]">
              {dateBadge}
            </span>
            <p className={`font-bold text-gray-800 ${inModal ? "text-sm" : "text-xs line-clamp-2"}`}>
              {slide.caption || campaignTitle}
            </p>
          </div>
        ) : (
          <>
            <img
              src={mobileSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="campaign-ambient-bg absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
            />
            <img
              src={mobileSrc}
              alt={slide.caption ? `${campaignTitle} — ${slide.caption}` : campaignTitle}
              draggable={false}
              onError={() => setMobileError(true)}
              className="relative z-10 w-full h-full object-contain"
            />
          </>
        )}
      </div>
    </div>
  );
}

export function CampanhasClient({ campaigns }: { campaigns: CampaignItem[] }) {
  const latestCampaign = useMemo(() => {
    if (campaigns.length === 0) return null;
    return [...campaigns].sort((a, b) => {
      if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year);
      if (b.monthNumber !== a.monthNumber) return b.monthNumber - a.monthNumber;
      return b.day - a.day;
    })[0];
  }, [campaigns]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>([...CAMPAIGN_YEARS, ...campaigns.map((c) => c.year)]);
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [campaigns]);

  const [selectedYear, setSelectedYear] = useState<string>(
    latestCampaign?.year ?? availableYears[0] ?? "2026"
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    latestCampaign?.month ?? "Setembro"
  );

  // Estado do Pop-up com suporte a transição suave na abertura e no fechamento
  const [activeCampaign, setActiveCampaign] = useState<CampaignItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carouselViewportRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    startTime: number;
    lockedAxis: "x" | "y" | null;
    captured: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    startTime: 0,
    lockedAxis: null,
    captured: false,
  });

  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((campaign) => campaign.year === selectedYear && campaign.month === selectedMonth)
      .sort((a, b) => a.day - b.day);
  }, [campaigns, selectedYear, selectedMonth]);

  const openModal = useCallback((campaign: CampaignItem) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveCampaign(campaign);
    setCurrentSlide(0);
    setDragOffsetX(0);
    setIsDragging(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsModalVisible(true);
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    setIsDragging(false);
    setDragOffsetX(0);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActiveCampaign(null);
      setCurrentSlide(0);
    }, MODAL_TRANSITION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const totalSlides = activeCampaign?.images.length ?? 0;
  const hasMultipleSlides = totalSlides > 1;

  const prevSlide = useCallback(() => {
    if (!activeCampaign || activeCampaign.images.length <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? activeCampaign.images.length - 1 : prev - 1));
  }, [activeCampaign]);

  const nextSlide = useCallback(() => {
    if (!activeCampaign || activeCampaign.images.length <= 1) return;
    setCurrentSlide((prev) => (prev === activeCampaign.images.length - 1 ? 0 : prev + 1));
  }, [activeCampaign]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!hasMultipleSlides) return;

      // Caso um segundo dedo toque a tela (ex.: gesto de pinça para zoom), cancela o arraste de 1 dedo
      if (!e.isPrimary) {
        dragStateRef.current.pointerId = null;
        dragStateRef.current.lockedAxis = null;
        dragStateRef.current.captured = false;
        setIsDragging(false);
        setDragOffsetX(0);
        return;
      }

      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        startTime: Date.now(),
        lockedAxis: null,
        captured: false,
      };
    },
    [hasMultipleSlides]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!hasMultipleSlides || state.pointerId !== e.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      state.lastX = e.clientX;

      if (state.lockedAxis === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

        if (Math.abs(dy) > Math.abs(dx) * 1.25) {
          state.lockedAxis = "y";
          state.pointerId = null;
          setIsDragging(false);
          setDragOffsetX(0);
          return;
        }

        state.lockedAxis = "x";
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
          state.captured = true;
        } catch {
          // Ponteiro já liberado pelo navegador
        }
      }

      if (state.lockedAxis === "x") {
        const isPastStart = currentSlide === 0 && dx > 0;
        const isPastEnd = currentSlide === totalSlides - 1 && dx < 0;
        const dampedDx = isPastStart || isPastEnd ? dx * 0.28 : dx;
        setDragOffsetX(dampedDx);
      }
    },
    [hasMultipleSlides, currentSlide, totalSlides]
  );

  const handlePointerEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (state.pointerId !== e.pointerId) return;

      if (state.captured) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Ponteiro já liberado
        }
      }

      if (state.lockedAxis === "x" && hasMultipleSlides) {
        const endX = e.type === "pointercancel" ? state.lastX : e.clientX;
        const dx = endX - state.startX;
        const width = carouselViewportRef.current?.clientWidth || 320;
        const elapsed = Math.max(1, Date.now() - state.startTime);
        const velocity = Math.abs(dx) / elapsed;
        const distanceThreshold = Math.min(65, width * 0.16);
        const isQuickFlick = e.type === "pointerup" && velocity > 0.3 && Math.abs(dx) > 20;

        if ((dx < -distanceThreshold || (isQuickFlick && dx < 0)) && currentSlide < totalSlides - 1) {
          setCurrentSlide((prev) => prev + 1);
        } else if ((dx > distanceThreshold || (isQuickFlick && dx > 0)) && currentSlide > 0) {
          setCurrentSlide((prev) => prev - 1);
        }
      }

      dragStateRef.current.pointerId = null;
      dragStateRef.current.lockedAxis = null;
      dragStateRef.current.captured = false;
      setIsDragging(false);
      setDragOffsetX(0);
    },
    [hasMultipleSlides, currentSlide, totalSlides]
  );

  useEffect(() => {
    if (!activeCampaign) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowLeft" && hasMultipleSlides) prevSlide();
      if (event.key === "ArrowRight" && hasMultipleSlides) nextSlide();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCampaign, hasMultipleSlides, closeModal, prevSlide, nextSlide]);

  const activeSlide = activeCampaign?.images[currentSlide];

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PreviousPage />

      {/* Cabeçalho e Filtros de Ano e Mês */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-4 mb-6 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Campanhas da CIPA</h1>
          <p className="text-sm text-gray-500 max-w-[60ch]">
            Selecione o ano e o mês para visualizar a linha do tempo de cartazes publicados no período. Clique em qualquer campanha para visualizar todas as páginas em destaque.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 shrink-0">
          <div className="flex flex-col gap-1.5 w-full sm:w-36">
            <label htmlFor="campaign-year" className="text-xs font-bold text-gray-700">
              Ano
            </label>
            <select
              id="campaign-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30 cursor-pointer"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-48">
            <label htmlFor="campaign-month" className="text-xs font-bold text-gray-700">
              Mês
            </label>
            <select
              id="campaign-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30 cursor-pointer"
            >
              {CAMPAIGN_MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo do período selecionado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-6">
        <p className="text-sm font-bold text-gray-800">
          Exibindo campanhas de{" "}
          <span className="text-[#1f7a3d] whitespace-nowrap">
            {selectedMonth} de {selectedYear}
          </span>
        </p>
        <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
          {filteredCampaigns.length}{" "}
          {filteredCampaigns.length === 1 ? "campanha encontrada" : "campanhas encontradas"}
        </span>
      </div>

      {/* Mensagem explicativa caso não haja cartazes na data escolhida */}
      {filteredCampaigns.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center justify-center text-center bg-white border border-gray-200 rounded-2xl py-16 px-6 mb-12 gap-3 shadow-sm"
        >
          <CalendarX2 className="w-11 h-11 text-gray-400" />
          <h2 className="text-lg font-bold text-gray-900">
            Não há cartazes publicados em {selectedMonth} de {selectedYear}
          </h2>
          <p className="text-sm text-gray-500 max-w-lg leading-relaxed">
            Nenhuma campanha ou cartaz foi registrado para a data escolhida ({selectedMonth}/{selectedYear}). Utilize os seletores de <strong>Ano</strong> e <strong>Mês</strong> acima para consultar outros períodos com materiais disponíveis.
          </p>
          {latestCampaign && (
            <button
              type="button"
              onClick={() => {
                setSelectedYear(latestCampaign.year);
                setSelectedMonth(latestCampaign.month);
              }}
              className="campaign-empty-cta mt-2 inline-flex items-center justify-center text-center gap-2 rounded-full bg-[#1f7a3d] hover:bg-[#196331] text-white text-xs font-bold px-4 py-2.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                Ver cartazes de{" "}
                <span className="whitespace-nowrap">
                  {latestCampaign.month} de {latestCampaign.year}
                </span>
              </span>
            </button>
          )}
        </div>
      ) : (
        <section
          aria-label={`Linha do tempo de ${selectedMonth} de ${selectedYear}`}
          className="relative py-4 mb-12"
        >
          {/* Eixo vertical */}
          <div
            aria-hidden="true"
            className="campaign-timeline-line absolute top-0 bottom-0 left-4 md:left-1/2 md:-translate-x-1/2 w-0.5 bg-[#1f7a3d]/25"
          />

          <ol className="flex flex-col gap-10">
            {filteredCampaigns.map((campaign, index) => {
              const isLeft = index % 2 === 0;
              const coverSlide = campaign.images[0];

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

                  <div className={isLeft ? "md:col-start-1 md:pr-4" : "md:col-start-2 md:pl-4"}>
                    <button
                      type="button"
                      onClick={() => openModal(campaign)}
                      aria-label={`Abrir campanha de ${campaign.dateFormatted}: ${campaign.title}`}
                      className="campaign-card-btn w-full text-left group bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[#1f7a3d]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] transition-all cursor-pointer flex flex-col gap-4"
                    >
                      {/* Capa da Campanha (9:16 no mobile / 16:9 no desktop) */}
                      {coverSlide && (
                        <div className="relative w-full overflow-hidden rounded-xl">
                          <ResponsiveCampaignArt
                            slide={coverSlide}
                            campaignTitle={campaign.title}
                            dateBadge={campaign.dateFormatted}
                          />

                          {campaign.images.length > 1 && (
                            <span className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 bg-black/75 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                              <Images className="w-3.5 h-3.5" />
                              {campaign.images.length} cartazes
                            </span>
                          )}

                          <div className="campaign-zoom-overlay absolute inset-0 z-20 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
                            <span className="campaign-zoom-pill inline-flex items-center gap-1.5 bg-white text-gray-900 text-xs font-bold px-3.5 py-2 rounded-full shadow">
                              <ZoomIn className="w-4 h-4" />
                              Abrir campanha
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Informações da Campanha */}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1f7a3d] bg-[#1f7a3d]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                            <Calendar className="w-3 h-3 shrink-0" />
                            {campaign.dateFormatted}
                          </span>
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {campaign.tag}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-[#1f7a3d] transition-colors">
                          {campaign.title}
                        </h2>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {campaign.description}
                        </p>
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Pop-up Ocupando no Mínimo 80% da Tela + Blur no Fundo + Carrossel em Ordem Numérica + Transição Suave */}
      {activeCampaign && activeSlide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Campanha em destaque: ${activeCampaign.title}`}
          onClick={closeModal}
          className={`campaign-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md transition-opacity duration-300 ease-in-out ${
            isModalVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Caixa de Pop-up (mínimo de 80% de largura e altura da tela) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`campaign-popup-box relative w-[92vw] sm:w-[86vw] min-w-[80vw] h-[85vh] min-h-[80vh] max-h-[92vh] bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col justify-between overflow-hidden transition-all duration-300 ease-out ${
              isModalVisible
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-95 translate-y-4"
            }`}
          >
            {/* Cabeçalho do Pop-up */}
            <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-7 py-3.5 sm:py-4 border-b border-gray-100 shrink-0">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-bold text-[#1f7a3d] whitespace-nowrap">
                    {activeCampaign.dateFormatted}
                    <span className="hidden sm:inline">
                      {" "}({activeCampaign.dateLabel} de {activeCampaign.year})
                    </span>
                  </span>
                  <span className="hidden sm:inline text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {activeCampaign.tag}
                  </span>
                  {hasMultipleSlides && (
                    <span className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {currentSlide + 1} / {totalSlides}
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-xl font-bold text-gray-900 line-clamp-2 sm:truncate leading-snug">
                  {activeCampaign.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar pop-up da campanha"
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Palco Central do Carrossel (16:9 no Desktop / 9:16 no Mobile) com suporte a arraste (swipe) */}
            <div className="relative flex-1 min-h-0 overflow-hidden bg-[#fbfbfd]">
              {hasMultipleSlides && (
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Cartaz anterior"
                  className="absolute left-1.5 sm:left-5 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-3 rounded-full bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-md transition-transform hover:scale-105 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              <div
                ref={carouselViewportRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                onDragStart={(e) => e.preventDefault()}
                style={{ touchAction: hasMultipleSlides ? "pinch-zoom" : "auto" }}
                className={`w-full h-full overflow-hidden select-none ${
                  hasMultipleSlides ? "cursor-grab active:cursor-grabbing" : ""
                }`}
              >
                <div
                  style={{
                    transform: `translate3d(calc(${-currentSlide * 100}% + ${dragOffsetX}px), 0, 0)`,
                    transition: isDragging
                      ? "none"
                      : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  className="flex w-full h-full will-change-transform"
                >
                  {activeCampaign.images.map((slide, idx) => (
                    <div
                      key={`${activeCampaign.id}-${idx}`}
                      aria-hidden={idx !== currentSlide}
                      className="w-full h-full shrink-0 flex items-center justify-center px-3 sm:px-14 py-4"
                    >
                      <ResponsiveCampaignArt
                        slide={slide}
                        campaignTitle={activeCampaign.title}
                        dateBadge={activeCampaign.dateFormatted}
                        inModal
                      />
                    </div>
                  ))}
                </div>
              </div>

              {hasMultipleSlides && (
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Próximo cartaz"
                  className="absolute right-1.5 sm:right-5 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-3 rounded-full bg-white/95 hover:bg-white text-gray-900 border border-gray-200 shadow-md transition-transform hover:scale-105 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {/* Rodapé do Pop-up e Indicadores do Carrossel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-7 py-3.5 border-t border-gray-100 shrink-0">
              <p className="text-xs text-gray-600 text-center sm:text-left line-clamp-2">
                {activeSlide.caption || activeCampaign.description}
              </p>

              {hasMultipleSlides && (
                <div
                  className="flex items-center gap-2 shrink-0"
                  role="tablist"
                  aria-label="Páginas da campanha"
                >
                  {activeCampaign.images.map((_, idx) => {
                    const isCurrent = idx === currentSlide;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        aria-label={`Ir para cartaz ${idx + 1}`}
                        onClick={() => setCurrentSlide(idx)}
                        className={`campaign-carousel-dot h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                          isCurrent ? "w-7 bg-[#1f7a3d]" : "w-2.5 bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
