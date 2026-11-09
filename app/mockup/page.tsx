"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ImageIcon,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Boxes } from "@/app/mockup/mockBoxes";
import { Button } from "@/components/mockup/Button";
import { FastAcess } from "./mockFastAcess";

const DEFAULT_POSTER_URL = "/mockup/campanhas/30-9-2026/1.png";
const DEFAULT_POSTER_LABEL = "Segurança Elétrica — 30/09/2026";

export default function MockupHomePage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(DEFAULT_POSTER_URL);
  const [customObjectUrl, setCustomObjectUrl] = useState<string | null>(null);
  const [posterLabel, setPosterLabel] = useState<string>(DEFAULT_POSTER_LABEL);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (customObjectUrl) {
        URL.revokeObjectURL(customObjectUrl);
      }
    };
  }, [customObjectUrl]);

  const applySelectedFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;

    if (customObjectUrl) {
      URL.revokeObjectURL(customObjectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomObjectUrl(objectUrl);
    setPreview(objectUrl);
    setPosterLabel(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applySelectedFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    applySelectedFile(e.dataTransfer.files?.[0]);
  };

  const handleRestoreDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (customObjectUrl) {
      URL.revokeObjectURL(customObjectUrl);
      setCustomObjectUrl(null);
    }
    setPreview(DEFAULT_POSTER_URL);
    setPosterLabel(DEFAULT_POSTER_LABEL);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
          aria-label="Selecionar ou arrastar nova imagem para o cartaz do mês"
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
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full sm:w-80 h-52 p-3 rounded-2xl cursor-pointer group transition-all shrink-0 border-2 ${
            isDraggingOver
              ? "bg-[#1f7a3d]/10 border-[#1f7a3d] border-dashed scale-[1.01]"
              : "bg-[#f5f5f7] border-transparent hover:border-[#1f7a3d]/40"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {preview ? (
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black/5">
              <img
                src={preview}
                alt={`Cartaz do mês: ${posterLabel}`}
                onError={() => setPreview(null)}
                className="w-full h-full object-contain rounded-xl"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white p-3 text-center">
                <Upload className="w-6 h-6" aria-hidden="true" />
                <span className="text-xs font-bold">
                  Clique ou arraste outra imagem para substituir
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 border border-dashed border-gray-400/80 rounded-xl p-4 group-hover:border-[#1f7a3d] transition-colors">
              <ImageIcon className="w-8 h-8 text-gray-500" aria-hidden="true" />
              <p className="text-sm text-gray-800 font-medium text-center">
                Arraste aqui o cartaz do mês ou clique para enviar
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1f7a3d] bg-[#1f7a3d]/10 px-2.5 py-1 rounded-full">
              Destaque CIPA
            </span>
            {posterLabel && (
              <span className="text-xs text-gray-500 truncate max-w-xs">
                {posterLabel}
              </span>
            )}
          </div>

          <h2 className="font-bold text-xl text-gray-900">Campanha do mês</h2>
          <p className="text-sm text-gray-600 max-w-[75ch] leading-relaxed">
            Atualizado periodicamente pela CIPA. Arraste uma nova imagem no quadro ao lado (ou clique sobre ele) para substituir o cartaz em exibição — todos os cartazes anteriores permanecem organizados na linha do tempo de Campanhas.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              className="bg-[#1f7a3d] hover:bg-[#196331] text-white font-bold px-4 py-2 text-xs shadow-sm"
              onClick={() => router.push("/mockup/campanhas")}
              title="Ver Campanhas Anteriores"
              icon={<ArrowRight size={14} />}
            />
            {customObjectUrl && (
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
    </main>
  );
}
