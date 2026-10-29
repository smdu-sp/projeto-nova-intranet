"use client";

import { useState, useEffect, useMemo } from "react";

import { useSession } from "next-auth/react";

import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import DataTable from "@/components/data-table";

import { getColumns, type UsuarioRow } from "./_components/columns";
import { validarPermissao } from "@/services/permissoes";

type CoordenadoriaOption = {
  id: string;
  nome: string;
};

export default function UsuariosAdminPage() {
  const { data: session } = useSession();
  const [temPermissao, setTemPermissao] = useState(false);

  useEffect(() => {
    validarPermissao("usuarios.importar").then(setTemPermissao);
  }, []);

  const searchParams = useSearchParams();

  const pagina = Number(searchParams.get("pagina")) || 1;

  const limite = Number(searchParams.get("limite")) || 10;

  const [login, setLogin] = useState("");

  const [resultado, setResultado] = useState<any>(null);

  const [erro, setErro] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [loadingLote, setLoadingLote] = useState(false);

  const [resultadoLote, setResultadoLote] = useState<{
    importadosD: number;
    importadosX: number;
    atualizadosD: number;
    atualizadosX: number;
    erros: string[];
  } | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);

  const [totalUsuarios, setTotalUsuarios] = useState(0);

  const [coordenadorias, setCoordenadorias] = useState<CoordenadoriaOption[]>(
    [],
  );


  async function carregarUsuarios() {
    try {
      const res = await fetch(
        `/api/usuarios?pagina=${pagina}&limite=${limite}`,
      );

      if (res.ok) {
        const data = await res.json();

        setUsuarios(Array.isArray(data.itens) ? data.itens : []);

        setTotalUsuarios(data.total || 0);
      }
    } catch {
      setUsuarios([]);

      setTotalUsuarios(0);
    }
  }

  async function carregarCoordenadorias() {
    try {
      const res = await fetch("/api/coordenadorias");

      if (res.ok) {
        const data = await res.json();

        setCoordenadorias(Array.isArray(data) ? data : []);
      }
    } catch {
      setCoordenadorias([]);
    }
  }

  useEffect(() => {
    if (session && temPermissao) {
      carregarUsuarios();

      carregarCoordenadorias();
    }
  }, [session, temPermissao, pagina, limite]);

  async function alterarCoordenadoria(
    usuarioId: string,
    coordenadoriaId: string | null,
  ) {
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          coordenadoriaId,
        }),
      });

      if (res.ok) {
        carregarUsuarios();
      }
    } catch {
      // silencioso
    }
  }

  const columns = useMemo(
    () => getColumns(coordenadorias, alterarCoordenadoria),

    [coordenadorias],
  );

  async function importar() {
    setErro(null);

    setResultado(null);

    setLoading(true);

    try {
      const resp = await fetch("/api/usuarios/importar", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          login,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setErro(data.error ?? "Erro ao importar usuário");
      } else {
        setResultado(data);

        carregarUsuarios();
      }
    } catch {
      setErro("Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function importarLoteDeX() {
    setErro(null);

    setResultadoLote(null);

    setLoadingLote(true);

    try {
      const resp = await fetch("/api/usuarios/importar-lote", {
        method: "POST",
      });

      const data = await resp.json();

      if (!resp.ok) {
        setErro(data.error ?? "Erro ao importar em lote.");
      } else {
        setResultadoLote(data);

        carregarUsuarios();
      }
    } catch {
      setErro("Falha na comunicação com o servidor.");
    } finally {
      setLoadingLote(false);
    }
  }

  return (
    <div className="w-full px-0 md:px-8 relative pb-20 md:pb-14 h-full md:container mx-auto">
      <h1 className="text-xl md:text-4xl font-bold">Usuários</h1>

      <p className="text-sm text-muted-foreground mt-1">
        Importar usuários do Active Directory e vincular coordenadorias.
      </p>

      <div className="flex flex-col max-w-sm mx-auto md:max-w-full gap-3 my-5 w-full">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label htmlFor="login">Login de rede</Label>

            <Input
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Login para importar do AD"
              className="w-full"
            />
          </div>

          <Button onClick={importar} disabled={!login || loading}>
            {loading ? "Importando..." : "Importar do AD"}
          </Button>
          <Button variant="outline" onClick={importarLoteDeX} disabled={loadingLote}>
            {loadingLote ? "Importando..." : "Importar todos do AD"}
          </Button>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {resultadoLote && (
          <div className="text-sm rounded-md border border-border bg-muted/30 p-3 space-y-1">
            <p className="font-medium">Importação em lote concluída</p>

            <p>
              Login D*: {resultadoLote.importadosD} novos,{" "}
              {resultadoLote.atualizadosD} atualizados (permissão USR – podem
              reservar).
            </p>

            <p>
              Login X*: {resultadoLote.importadosX} novos,{" "}
              {resultadoLote.atualizadosX} atualizados (permissão TEC – não
              podem reservar).
            </p>

            {resultadoLote.erros.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-destructive">Erros:</p>

                <ul className="list-disc list-inside text-destructive">
                  {resultadoLote.erros.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}

                  {resultadoLote.erros.length > 10 && (
                    <li>… e mais {resultadoLote.erros.length - 10} erros.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {resultado && (
          <pre className="bg-muted text-foreground text-xs p-3 rounded-md overflow-auto max-h-64 border border-border">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        )}

        <DataTable
          columns={columns}
          data={usuarios}
          paginaAtual={pagina}
          limitePorPagina={limite}
          totalItens={totalUsuarios}
          labelItemSingular="usuário"
          labelItemPlural="usuários"
        />
      </div>
    </div>
  );
}
