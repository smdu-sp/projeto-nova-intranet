import PreviousPage from "@/components/mockup/PreviousPage";
import { MockInfo, TableInfo } from "./MokcInfo";

export default function Informacoes() {
  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PreviousPage />
      <div className="flex-1 flex-col gap-4 py-4">
        <h1 className="text-3xl font-bold">Temos bastante informação para compartilhar</h1>
        <p className="text-xs max-w-[500px]">
          Cartazes, e-mails informativos, mapa de risco, legislação e muito mais. Tudo o que a CIPA produz fica arquivado aqui — inclusive cartazes de meses anteriores.
        </p>
      </div>
      <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MockInfo.map(({ id, title, description }) => (
          <div key={id} className="flex-1 flex-col gap-4 p-4 border-2 border-green-700 rounded-xl">
            <p className="text-sm font-bold">{title}</p>
            <p className="text-xs">{description}</p>
          </div>
        ))}
      </section>
      <table className="w-full mt-8 border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-1/4 py-3 px-4 text-start text-xs font-bold rounded-tl-xl">Tema</th>
            <th className="w-1/2 py-3 px-4 text-start text-xs font-bold">Descrição</th>
            <th className="w-1/4 py-3 px-4 text-start text-xs font-bold rounded-tr-xl">Acesso</th>
          </tr>
        </thead>
        <tbody>
          {TableInfo.map(({ id, theme, description, access }) => (
            <tr key={id} className="border-b border-gray-100">
              <td className="w-1/4 py-3 px-4">
                <p className="text-xs font-bold">{theme}</p>
              </td>
              <td className="w-1/2 py-3 px-4">
                <p className="text-xs text-gray-600">{description}</p>
              </td>
              <td className="w-1/4 py-3 px-4">
                <p className="text-xs text-gray-500 italic">{access}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
