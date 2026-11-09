"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Info, X } from "lucide-react";
import { PageHeader } from "@/components/mockup/page-header";
import { MockInfo, TableInfo, type MockInfoProps } from "./MokcInfo";

export default function InformacoesPage() {
  const [selectedTopic, setSelectedTopic] = useState<MockInfoProps | null>(null);

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PageHeader
        badge="Acervo e Orientações"
        title="Temos bastante informação para compartilhar"
        description="Cartazes, e-mails informativos, mapa de risco, legislação e muito mais. Tudo o que a CIPA produz fica arquivado aqui — inclusive cartazes de meses anteriores."
        showBorder
      />

      {/* Cards de Temas Interativos */}
      <section
        aria-label="Temas em destaque"
        className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      >
        {MockInfo.map((topic) => {
          const isSelected = selectedTopic?.id === topic.id;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() =>
                setSelectedTopic((prev) => (prev?.id === topic.id ? null : topic))
              }
              aria-expanded={isSelected}
              className={`text-left flex flex-col justify-between gap-3 p-5 border-2 rounded-2xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] ${
                isSelected
                  ? "bg-[#1f7a3d] text-white border-[#1f7a3d] shadow-md"
                  : "bg-white text-gray-900 border-[#1f7a3d]/70 hover:border-[#1f7a3d] hover:shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold">{topic.title}</h2>
                  <Info
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? "text-white" : "text-[#1f7a3d]"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    isSelected ? "text-white/90" : "text-gray-600"
                  }`}
                >
                  {topic.description}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                  isSelected ? "text-white underline" : "text-[#1f7a3d]"
                }`}
              >
                {isSelected ? "Ocultar resumo" : "Saiba mais"}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </section>

      {/* Painel de Detalhes do Tema Selecionado */}
      {selectedTopic && (
        <section
          aria-live="polite"
          className="mt-6 bg-white border-2 border-[#1f7a3d] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1f7a3d]">
                Resumo informativo
              </span>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedTopic.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTopic(null)}
              aria-label="Fechar detalhes do tema"
              className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed max-w-[80ch]">
            {selectedTopic.details}
          </p>

          {selectedTopic.href && (
            <div className="pt-1">
              <Link
                href={selectedTopic.href}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1f7a3d] hover:bg-[#196331] text-white px-4 py-2 rounded-full transition-colors"
              >
                <span>{selectedTopic.actionLabel || "Acessar conteúdo"}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Tabela de Materiais e Documentos */}
      <section aria-labelledby="heading-materiais" className="mt-10 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-[#1f7a3d]" aria-hidden="true" />
          <h2 id="heading-materiais" className="text-lg font-bold text-gray-900">
            Materiais e documentos disponíveis
          </h2>
        </div>

        <div className="w-full overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th scope="col" className="w-1/3 py-3.5 px-4 text-xs font-bold text-gray-800">
                  Tema
                </th>
                <th scope="col" className="w-5/12 py-3.5 px-4 text-xs font-bold text-gray-800">
                  Descrição
                </th>
                <th scope="col" className="w-1/4 py-3.5 px-4 text-xs font-bold text-gray-800">
                  Acesso
                </th>
              </tr>
            </thead>
            <tbody>
              {TableInfo.map(({ id, theme, description, access, href, topicId }) => {
                const relatedTopic = topicId
                  ? MockInfo.find((t) => t.id === topicId)
                  : undefined;

                return (
                  <tr
                    key={id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-bold text-gray-900">{theme}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-gray-600">{description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {href ? (
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#1f7a3d] hover:underline"
                        >
                          <span>{access}</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      ) : access === "Ver orientações" && relatedTopic ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopic(relatedTopic);
                            window.scrollTo({ top: 180, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#1f7a3d] hover:underline cursor-pointer"
                        >
                          <span>{access}</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="inline-block text-xs text-gray-500 italic bg-gray-100 px-2.5 py-0.5 rounded-full">
                          {access}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
