import PreviousPage from "@/components/mockup/PreviousPage";
import { MockPartners } from "./MockPartners";

export default function Parcerias() {
  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4">
      <PreviousPage />
      <table className="w-full">
        <thead className="bg-gray-100 ">
          <tr>
            <td className="text-left p-2 font-bold rounded-tl-2xl">#</td>
            <td className="text-left p-2 font-bold">Tema</td>
            <td className="text-left p-2 font-bold">Descrição</td>
            <td className="text-left p-2 font-bold rounded-tr-2xl">Acesso</td>
          </tr>
        </thead>
        <tbody>
          {MockPartners.map(({ access, description, id, position, tema }) => (
            <tr key={id}>
              <td className="text-left p-2 font-thin text-xs">{position}</td>
              <td className="text-left p-2 font-bold text-xs">{tema}</td>
              <td className="text-left p-2 font-thin text-xs">{description}</td>
              <td className="text-left p-2 font-thin text-xs italic">{access}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
