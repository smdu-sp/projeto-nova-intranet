"use client";

import { useMemo, useState } from "react";
import { Phone, Search, UserRound } from "lucide-react";
import { PageHeader } from "@/components/mockup/page-header";
import { mockPeople, WORK_GROUPS, type PersonProps } from "./mockPeople";
import { MockPhones } from "./mockPhones";

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((word) => !["da", "de", "do", "das", "dos"].includes(word.toLowerCase()));
  if (parts.length === 0) return "CI";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function matchesGroup(person: PersonProps, selectedGroup: string): boolean {
  if (selectedGroup === "Todos") return true;
  if (selectedGroup === "Diretoria") {
    return Boolean(person.role && person.role !== "—");
  }
  return Boolean(
    person.department &&
      person.department.toLowerCase().includes(selectedGroup.toLowerCase())
  );
}

export default function IntegrantesPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [phoneQuery, setPhoneQuery] = useState<string>("");

  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mockPeople.filter((person) => {
      if (!matchesGroup(person, selectedGroup)) return false;
      if (!q) return true;
      return (
        person.name.toLowerCase().includes(q) ||
        (person.unit && person.unit.toLowerCase().includes(q)) ||
        (person.role && person.role.toLowerCase().includes(q)) ||
        (person.department && person.department.toLowerCase().includes(q))
      );
    });
  }, [selectedGroup, searchQuery]);

  const filteredPhones = useMemo(() => {
    const q = phoneQuery.trim().toLowerCase();
    if (!q) return MockPhones;
    return MockPhones.filter(
      (item) =>
        item.coordinator.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q)
    );
  }, [phoneQuery]);

  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PageHeader
        badge="Gestão 2026–2028"
        title="Integrantes da CIPA SMUL"
        description="Conheça a gestão atual, os grupos de trabalho (GTs) e os ramais de cada coordenadoria."
        showBorder
      />

      {/* Filtros de Grupo de Trabalho e Busca */}
      <section
        aria-label="Filtros de integrantes"
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
      >
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar por grupo de trabalho">
          {WORK_GROUPS.map((group) => {
            const isActive = selectedGroup === group;
            return (
              <button
                key={group}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedGroup(group)}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1f7a3d] text-white border-[#1f7a3d] shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:border-[#1f7a3d]/50 hover:text-[#1f7a3d]"
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar integrante ou unidade..."
            aria-label="Buscar integrante ou unidade"
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3.5 py-2 text-xs text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30"
          />
        </div>
      </section>

      {/* Galeria de Fotos da Equipe */}
      <section aria-labelledby="heading-fotos-equipe" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 id="heading-fotos-equipe" className="text-lg font-bold text-gray-900">
            Fotos da equipe
          </h2>
          <span className="text-xs text-gray-500">
            {filteredPeople.length}{" "}
            {filteredPeople.length === 1 ? "integrante" : "integrantes"}
          </span>
        </div>

        {filteredPeople.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-500">
            Nenhum integrante encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {filteredPeople.map(({ id, name, unit, role, photoUrl }) => {
              const hasRole = role && role !== "—";
              return (
                <article
                  key={id}
                  className="flex flex-col items-center bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:border-[#1f7a3d]/50 transition-all"
                >
                  <div className="w-full aspect-[3/4] max-h-40 flex flex-col text-center items-center justify-center rounded-lg gap-2 bg-[#f5f5f7] border border-dashed border-gray-300 p-3 overflow-hidden">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <>
                        <div className="w-11 h-11 rounded-full bg-[#1f7a3d]/10 text-[#1f7a3d] flex items-center justify-center font-bold text-xs">
                          {getInitials(name)}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-normal">
                          <UserRound className="w-3 h-3" aria-hidden="true" />
                          Foto da equipe
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col text-center gap-0.5 pt-2.5 px-1">
                    <p className="font-bold text-xs text-gray-900 leading-snug">
                      {name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {unit && unit !== "—" ? unit : "SMUL"}
                    </p>
                    {hasRole && (
                      <span className="mt-1 inline-block text-[10px] font-bold text-[#1f7a3d] bg-[#1f7a3d]/10 px-2 py-0.5 rounded-full">
                        {role}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Tabela: Composição e Grupos de Trabalho */}
      <section aria-labelledby="heading-composicao" className="mb-10">
        <h2 id="heading-composicao" className="text-lg font-bold text-gray-900 mb-3">
          Composição e grupos de trabalho
        </h2>
        <div className="w-full overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-800">
                <th scope="col" className="py-3 px-4">Cargo</th>
                <th scope="col" className="py-3 px-4">Nome</th>
                <th scope="col" className="py-3 px-4">Unidade</th>
                <th scope="col" className="py-3 px-4">Grupo de trabalho</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map(({ id, name, role, unit, department }) => (
                <tr
                  key={id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 text-xs transition-colors"
                >
                  <td className="py-3 px-4 text-[#1f7a3d] font-bold whitespace-nowrap">
                    {role}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {name}
                  </td>
                  <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                    {unit}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabela: Ramais por Coordenadoria */}
      <section aria-labelledby="heading-ramais" className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 id="heading-ramais" className="text-lg font-bold text-gray-900">
              Ramais por coordenadoria
            </h2>
            <p className="text-xs text-gray-500">
              Telefones gerais das unidades da SMUL para contato rápido.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="Filtrar coordenadoria ou ramal..."
              aria-label="Filtrar coordenadoria ou ramal"
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3.5 py-2 text-xs text-gray-900 shadow-sm focus:border-[#1f7a3d] focus:outline-none focus:ring-2 focus:ring-[#1f7a3d]/30"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-800">
                <th scope="col" className="py-3 px-4">Coordenadoria / Unidade</th>
                <th scope="col" className="py-3 px-4">Telefone geral</th>
              </tr>
            </thead>
            <tbody>
              {filteredPhones.map(({ coordinator, phone }) => (
                <tr
                  key={coordinator}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 text-xs transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {coordinator}
                  </td>
                  <td className="py-3 px-4 text-gray-700 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#1f7a3d]" aria-hidden="true" />
                      {phone}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
