"use client";

import { useState } from "react";
import Link from "next/link";
import { Captions, Clock, PlayCircle, X } from "lucide-react";
import { PageHeader } from "@/components/mockup/page-header";
import { VideoCard } from "@/components/mockup/VideoCard";
import { mockVideos, type MockVideoItem } from "./mockVideos";

export default function VideosPage() {
  const [selectedVideo, setSelectedVideo] = useState<MockVideoItem | null>(null);

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PageHeader
        badge="Audiovisual e Acessibilidade"
        title="Venha assistir nossos vídeos"
        description="Vídeos educativos produzidos pela CIPA SMUL, disponíveis para assistir a qualquer momento — todos com legendas (CC) para garantir acessibilidade."
        showBorder
      />

      <section
        aria-label="Catálogo de vídeos da CIPA"
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
      >
        {mockVideos.map((video) => (
          <VideoCard
            key={video.id}
            id={video.id}
            title={video.title}
            description={video.description}
            category={video.category}
            duration={video.duration}
            status={video.status}
            hasCaptions={video.hasCaptions}
            onSelect={() => setSelectedVideo(video)}
          />
        ))}
      </section>

      {/* Modal de Prévia do Vídeo */}
      {selectedVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedVideo.title}
          onClick={() => setSelectedVideo(null)}
          className="campaign-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="campaign-popup-box w-full max-w-2xl bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a3d]">
                    {selectedVideo.category}
                  </span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {selectedVideo.duration}
                  </span>
                  {selectedVideo.hasCaptions && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                      <Captions className="w-3.5 h-3.5 text-[#1f7a3d]" aria-hidden="true" />
                      Legendado (CC)
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {selectedVideo.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                aria-label="Fechar prévia do vídeo"
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Área do Player (Placeholder 16:9) */}
            <div className="w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-6 text-center gap-3">
              <PlayCircle className="w-12 h-12 text-[#1f7a3d]" aria-hidden="true" />
              <p className="text-sm font-bold">
                Conteúdo em fase de finalização ({selectedVideo.status})
              </p>
              <p className="text-xs text-gray-300 max-w-md">
                Este vídeo está sendo preparado com legendas sincronizadas pela equipe de Comunicação da CIPA SMUL.
              </p>
            </div>

            {/* Detalhes e Tópicos Abordados */}
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedVideo.description}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-800">
                  Tópicos abordados:
                </span>
                {selectedVideo.topics.map((topic) => (
                  <span
                    key={topic}
                    className="text-xs bg-[#f5f5f7] border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Link
                  href="/mockup/campanhas"
                  className="text-xs font-bold text-[#1f7a3d] hover:underline"
                >
                  Ver cartazes relacionados nas Campanhas →
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-full transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
