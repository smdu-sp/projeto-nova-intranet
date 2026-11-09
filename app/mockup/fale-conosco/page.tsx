"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/mockup/page-header";
import {
  CIPA_OFFICIAL_EMAIL,
  mockDirectors,
  mockTalkWithUs,
} from "./mockTalkWithUs";

export default function FaleConoscoPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CIPA_OFFICIAL_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback caso clipboard API não esteja disponível
    }
  };

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PageHeader
        badge="Atendimento e Acolhimento"
        title="Quer falar com a gente?"
        description="Pode usar nosso e-mail oficial, deixar seu recado anônimo nas caixas físicas disponíveis nos andares ou falar diretamente com integrantes da diretoria."
      />

      <section
        id="acolhimento"
        aria-label="Canais de contato"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2"
      >
        {mockTalkWithUs.map(
          ({ id, icon, title, description, actionLabel, isLink, href, variant }) => {
            const isHighlight = variant === "highlight";

            return (
              <article
                key={id}
                className={`flex flex-1 flex-col justify-between gap-4 rounded-2xl p-6 transition-all ${
                  isHighlight
                    ? "bg-[#1f7a3d] text-white shadow-md"
                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-2.5 text-base font-bold">
                    {icon}
                    <span>{title}</span>
                  </h2>

                  {isLink && href ? (
                    <a
                      href={href}
                      className="text-sm font-bold text-[#1f7a3d] underline hover:opacity-80 break-all mt-1"
                    >
                      {description}
                    </a>
                  ) : (
                    <p
                      className={`text-sm leading-relaxed ${
                        isHighlight
                          ? "text-white/95 font-normal"
                          : "text-gray-600 font-normal"
                      }`}
                    >
                      {description}
                    </p>
                  )}
                </div>

                {isLink && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#1f7a3d]" />
                          <span>E-mail copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar e-mail</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {isHighlight && href && (
                  <div className="pt-2">
                    <a
                      href={href}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-white text-[#1f7a3d] hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      <span>{actionLabel || "Entrar em contato"}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                )}
              </article>
            );
          }
        )}
      </section>

      <section
        aria-label="Diretoria da CIPA"
        className="flex flex-col gap-4 mt-10 mb-8 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Fale diretamente com a diretoria
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Integrantes responsáveis pela coordenação da gestão atual da CIPA SMUL.
            </p>
          </div>
          <Link
            href="/mockup/equipe"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1f7a3d] hover:underline"
          >
            <UsersRound className="w-4 h-4" />
            <span>Ver equipe completa e ramais</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {mockDirectors.map(({ id, name, position }) => (
            <div
              key={id}
              className="flex flex-col justify-between gap-1 border border-gray-200 rounded-xl bg-[#f5f5f7] p-4"
            >
              <p className="text-sm font-bold text-gray-900">{name}</p>
              <p className="text-xs font-medium text-[#1f7a3d]">{position}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
