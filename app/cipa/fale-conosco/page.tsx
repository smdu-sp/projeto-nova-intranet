import PreviousPage from "@/components/mockup/PreviousPage";
import { mockTalkWithUs } from "./mockTalkWithUs";

const mockDirectors = [
  {
    name: "Leila Souza Petrini",
    position: "Presidente · PARHIS",
  },
  {
    name: "Rosemeire de Almeida",
    position: "Vice-presidente · GEOINFO",
  },
  {
    name: "Analice Barbosa Dos Santos",
    position: "1° secretária - CASE",
  },
  {
    name: "Hélio Freitas Filho",
    position: "2º secretário · SERVIN",
  },
];

export default function Eventos() {
  return (
    <main className="max-w-[1180px] mx-auto px-6 py-4 bg-[#fbfbfd]">
      <PreviousPage />
      <div className="py-8 w-full">
        <h1 className="font-extrabold text-xl">Quer falar com a gente ?</h1>
        <p className="text-gray-500 font-light text-base max-w-[65ch]">Pode usar nosso e-mail, deixar seu recado em nossas caixas ou falar diretamente com um de nós.</p>
      </div>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockTalkWithUs.map(({ id, icon, title, description, isLink, href, variant }) => {
          const isHighlight = variant === "highlight";

          return (
            <div
              key={id}
              className={`flex flex-1 flex-col justify-start gap-3 rounded-2xl p-6 transition-all ${
                isHighlight ? "bg-[#1f7a3d] text-white" : "bg-white text-gray-900 border border-gray-100/80 shadow-sm"
              }`}
            >
              <p className="flex items-center gap-2 text-base font-bold">
                {icon}
                {title}
              </p>

              {isLink && href ? (
                <a href={href} className="text-sm font-bold text-[#1f7a3d] underline hover:opacity-80 break-all mt-1">
                  {description}
                </a>
              ) : (
                <p className={`text-sm ${isHighlight ? "text-white/90 font-normal" : "text-gray-500 font-normal"}`}>{description}</p>
              )}
            </div>
          );
        })}
      </section>
      <section className="flex flex-col gap-4 mt-8">
        <p className="text-xl font-bold">Fale diretamente com a diretoria</p>
        <div className="flex flex-wrap gap-4">
          {mockDirectors.map(({ name, position }) => (
            <div key={name} className="flex flex-col flex-1 border rounded-lg min-w-48 bg-[#ffffff] p-2">
              <p className="text-sm font-bold p-2">{name}</p>
              <p className="text-sm p-2">{position}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
