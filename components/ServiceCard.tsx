import { listarPermissoes, verificarDesenvolvedor } from "@/services/permissoes";
import { ArrowRight, CalendarSearch, ClipboardCheck } from "lucide-react";
import Link from "next/link";

interface IModulo {
  nome: string;
  titulo: string;
  descricao: string;
  href: string;
  icon: React.ComponentType<any>;
  permissao: string;
}

const modulos = [
  {
    nome: "reserva-salas",
    titulo: "Reserva de Salas",
    descricao: "Aqui você pode reservar salas para utilização...",
    href: "/reserva-salas",
    icon: CalendarSearch,
    permissao: "reserva_salas.reservas.visualizar",
  },
  {
    nome: "avaliacao-limpeza",
    titulo: "Avaliação de Limpeza",
    descricao: "Aqui você pode avaliar a limpeza das salas e banheiros, etc...",
    href: "/avaliacao-limpeza",
    icon: ClipboardCheck,
    permissao: "avaliacao_limpeza.avaliacoes.visualizar",
  }
]

export default async function ServiceCards() {
  let modulosFiltrados: IModulo[] = [];
  try {
    const [permissoes, desenvolvedor] = await Promise.all([
      listarPermissoes(),
      verificarDesenvolvedor(),
    ]);
    modulosFiltrados = modulos.filter((modulo) =>
      modulo.nome === "avaliacao-limpeza"
        ? desenvolvedor
        : permissoes.includes(modulo.permissao)
    );
  } catch (error) {
    console.error("Erro ao listar permissões:", error);
    modulosFiltrados = [];
  }
  return (
    <section className="grid gap-6 md:grid-cols-2">
      {modulosFiltrados.map((modulo) => (
        <Link key={modulo.nome} href={modulo.href}>
          <div className="relative h-[180px] border rounded-xl p-5 cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all">
            
            <div className="flex items-center gap-3">
              <modulo.icon className="w-6 h-6" />
              <h2 className="font-medium">{modulo.titulo}</h2>
            </div>

            <p className="text-sm mt-3 max-w-[80%]">
              {modulo.descricao}
          </p>

            <ArrowRight
              className="absolute bottom-4 right-4 w-10 h-6"
              strokeWidth={1.5}
            />
          </div>
        </Link>
      ))}
    </section>
  );
}