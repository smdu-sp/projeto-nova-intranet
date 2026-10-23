import { TabsNav } from "@/components/tabs-nav";
import { abasAvaliacaoLimpeza } from "./abas";
import Titulo from "@/components/titulo";
import { redirect } from "next/navigation";
import { verificarDesenvolvedor } from "@/services/permissoes";

export default async function LayoutAvaliacaoLimpeza({ children }: { children: React.ReactNode }) {
  const desenvolvedor = await verificarDesenvolvedor();
  if (!desenvolvedor) redirect("/");
  return (
    <div className="w-full h-full flex flex-col">
      <TabsNav abas={abasAvaliacaoLimpeza} modulo="avaliacao_limpeza" />
      <Titulo abas={abasAvaliacaoLimpeza} />
      {children}
    </div>
  );
}
