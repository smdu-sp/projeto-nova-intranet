import PreviousPage from "@/components/mockup/PreviousPage";
import { ImageIcon } from "lucide-react";
import { mockPeople } from "./mockPeople";
import { MockPhones } from "./mockPhones";

export default function Integrantes() {
  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PreviousPage />
      <div className="flex-1 flex-col gap-4 py-4">
        <h1 className="text-3xl font-bold">Integrantes da CIPA 2026/2027</h1>
        <p className="text-xs max-w-[420px]">Conheça a gestão atual, os grupos de trabalho e os ramais de cada coordenadoria.</p>
      </div>
      <section>
        <div>
          <h1 className="py-4 font-bold">Fotos da equipe</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {mockPeople.map(({ id, name, unit }) => {
            return (
              <div key={id} className="flex flex-col items-center gap-2">
                <div className="w-25 h-40 flex flex-col text-center items-center justify-center rounded-lg gap-2 bg-[#f5f5f7] border border-dashed border-gray-300 p-4">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 font-normal">Miniatura do vídeo</span>
                </div>
                <div className="flex flex-col text-center gap-1 p-2 rounded-lg">
                  <p className="font-bold text-[11px] text-gray-900">{name}</p>
                  <p className="text-[10px] text-gray-500 italic">{unit}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div>
        <h1 className="py-4 font-bold">Composição e grupos de trabalho</h1>
      </div>
      <table className="w-full bg-gray-50">
        <thead>
          <tr className="bg-gray-200 text-sm">
            <th className="p-2 text-left rounded-tl-2xl">Cargo</th>
            <th className="p-2 text-left">Nome</th>
            <th className="p-2 text-left">Unidade</th>
            <th className="p-2 text-left rounded-tr-2xl">Grupo de trabalho</th>
          </tr>
        </thead>
        <tbody>
          {mockPeople.map(({ id, name, role, unit, department }) => {
            return (
              <tr key={id} className="border-b border-gray-200 text-xs">
                <td className="p-2 text-green-800 font-bold">{role}</td>
                <td className="p-2 font-semibold">{name}</td>
                <td className="p-2 font-light">{unit}</td>
                <td className="p-2 font-light">{department}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div>
        <h1 className="py-4 font-bold">Ramais por coordenadoria</h1>
      </div>
      <table className="w-full bg-gray-50 mb-8">
        <thead>
          <tr className="bg-gray-200 text-sm">
            <th className="p-2 text-left rounded-tl-2xl">Coordenadoria</th>
            <th className="p-2 text-left rounded-tr-2xl">Telefone geral</th>
          </tr>
        </thead>
        <tbody>
          {MockPhones.map(({ coordinator, phone }) => (
            <tr key={coordinator} className="border-b border-gray-200 text-xs">
              <td className="p-2 font-semibold">{coordinator}</td>
              <td className="p-2 font-light">{phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
