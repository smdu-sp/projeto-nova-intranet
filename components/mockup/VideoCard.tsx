import { Captions, Clock, PlayCircle } from "lucide-react";

export interface VideoCardProps {
  id: number;
  title?: string;
  description?: string;
  category?: string;
  duration?: string;
  status?: string;
  hasCaptions?: boolean;
  onSelect?: () => void;
}

export function VideoCard({
  id,
  title,
  description,
  category = "CIPA SMUL",
  duration,
  status = "Em breve",
  hasCaptions = true,
  onSelect,
}: VideoCardProps) {
  const videoTitle = title || `Vídeo da CIPA #${id}`;
  const isAvailable = status.toLowerCase() === "disponível";

  return (
    <div
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={`group flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-[#1f7a3d]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] ${
        onSelect ? "cursor-pointer" : ""
      }`}
    >
      {/* Miniatura em proporção 16:9 */}
      <div className="relative w-full aspect-video flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#f5f5f7] to-[#eaf6f0] border-b border-dashed border-gray-200 p-4 overflow-hidden">
        <div className="w-11 h-11 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-[#1f7a3d] group-hover:scale-110 group-hover:bg-[#1f7a3d] group-hover:text-white transition-all">
          <PlayCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {isAvailable ? "Clique para assistir" : "Prévia do conteúdo"}
        </span>

        {duration && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {duration}
          </span>
        )}

        {hasCaptions && (
          <span
            title="Legendado em Português (CC)"
            className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-white/90 text-gray-800 border border-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
          >
            <Captions className="w-3 h-3 text-[#1f7a3d]" aria-hidden="true" />
            CC
          </span>
        )}
      </div>

      {/* Conteúdo textual */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1f7a3d]">
              {category}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isAvailable
                  ? "bg-green-50 text-[#1f7a3d]"
                  : "bg-gray-100 text-gray-600 italic"
              }`}
            >
              {status}
            </span>
          </div>
          <h2 className="font-bold text-sm text-gray-900 group-hover:text-[#1f7a3d] transition-colors line-clamp-2">
            {videoTitle}
          </h2>
          {description && (
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
