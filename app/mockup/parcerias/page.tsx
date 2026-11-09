"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Handshake, Mail, X } from "lucide-react";
import { PageHeader } from "@/components/mockup/page-header";
import {
  MockPartners,
  PARTNER_CATEGORIES,
  type MockPartnersProps,
} from "./MockPartners";

export default function ParceriasPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [activePartner, setActivePartner] = useState<MockPartnersProps | null>(null);

  const filteredPartners = useMemo(() => {
    if (selectedCategory === "Todas") return MockPartners;
    return MockPartners.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PageHeader
        badge="Ações Conjuntas"
        title="Somos parceiros e apoiamos as ações"
        description="Conheça as oficinas, práticas integrativas (PICS) e canais de orientação promovidos por outros setores da SMUL com apoio e divulgação da CIPA."
        showBorder
      />

      {/* Filtro por Categoria */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filtrar parcerias por categoria"
        >
          {PARTNER_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(category)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1f7a3d] text-white border-[#1f7a3d] shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#1f7a3d]/50 hover:text-[#1f7a3d]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-gray-500">
          {filteredPartners.length}{" "}
          {filteredPartners.length === 1 ? "ação listada" : "ações listadas"}
        </span>
      </div>

      {/* Tabela de Parcerias */}
      <section aria-label="Lista de ações parceiras" className="mb-10">
        <div className="w-full overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-800">
                <th scope="col" className="py-3.5 px-4 w-12">#</th>
                <th scope="col" className="py-3.5 px-4">Tema / Programa</th>
                <th scope="col" className="py-3.5 px-4">Atividade / Descrição</th>
                <th scope="col" className="py-3.5 px-4 w-40">Acesso</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner) => {
                const { id, position, tema, category, description, access, href } =
                  partner;
                return (
                  <tr
                    key={id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-xs text-gray-500 font-medium">
                      {position}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">
                          {tema}
                        </span>
                        <span className="text-[10px] font-semibold bg-[#1f7a3d]/10 text-[#1f7a3d] px-2 py-0.5 rounded-full">
                          {category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {description}
                    </td>
                    <td className="py-3.5 px-4">
                      {href ? (
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1f7a3d] bg-[#1f7a3d]/10 hover:bg-[#1f7a3d] hover:text-white px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                        >
                          <span>{access}</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActivePartner(partner)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-gray-100 hover:bg-[#1f7a3d] hover:text-white px-3 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <span>{access}</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Informativo da Parceria / Inscrição */}
      {activePartner && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePartner.tema}
          onClick={() => setActivePartner(null)}
          className="campaign-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="campaign-popup-box w-full max-w-lg bg-white rounded-2xl border border-gray-200 p-6 shadow-xl flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1f7a3d]">
                  <Handshake className="w-3.5 h-3.5" aria-hidden="true" />
                  {activePartner.category} · {activePartner.access}
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  {activePartner.tema}
                </h2>
                <p className="text-xs font-semibold text-gray-600">
                  Atividade: {activePartner.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePartner(null)}
                aria-label="Fechar janela"
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              {activePartner.details}
            </p>

            <div className="bg-[#f5f5f7] rounded-xl p-3.5 border border-gray-200 text-xs text-gray-600 leading-relaxed">
              Para consultar o próximo cronograma de turmas e vagas disponíveis, acompanhe os comunicados internos da SMUL ou entre em contato com a CIPA.
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <a
                href={`mailto:cipasmul@prefeitura.sp.gov.br?subject=${encodeURIComponent(
                  `Informações sobre ${activePartner.tema} (${activePartner.description})`
                )}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1f7a3d] hover:bg-[#196331] text-white px-4 py-2 rounded-full transition-colors"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Solicitar informações por e-mail</span>
              </a>
              <button
                type="button"
                onClick={() => setActivePartner(null)}
                className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-full transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
