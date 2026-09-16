'use client';

import { useEffect, useMemo, useState } from 'react';
import { TIPOS_CHAMADO, TIPO_CHAMADO_META } from '../_types';
import type { TipoChamado } from '../_types';

type CategoriaRow = {
  id: number;
  nome: string;
  pai: string;
  filho: string | null;
  area: TipoChamado | null;
  ativo: boolean;
};

export function GerenciarCategorias() {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState('');
  const [pai, setPai] = useState('');
  const [filho, setFilho] = useState('');
  const [area, setArea] = useState<TipoChamado | ''>('');

  function carregar() {
    setCarregando(true);
    fetch('/api/helpdesk/categorias')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCategorias(data.categorias ?? []);
      })
      .catch((e) => setErro(String(e)))
      .finally(() => setCarregando(false));
  }

  useEffect(() => { carregar(); }, []);

  const visiveis = useMemo(
    () => categorias.filter((c) => mostrarInativas || c.ativo),
    [categorias, mostrarInativas],
  );

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const r = await fetch('/api/helpdesk/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, pai, filho: filho || null, area: area || null }),
    });
    const data = await r.json();
    if (!r.ok) { setErro(data.error); return; }
    setNome(''); setPai(''); setFilho(''); setArea('');
    carregar();
  }

  async function atualizarArea(id: number, novaArea: TipoChamado | '') {
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, area: novaArea || null } : c)));
    const r = await fetch(`/api/helpdesk/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: novaArea || null }),
    });
    if (!r.ok) { const data = await r.json(); setErro(data.error); carregar(); }
  }

  async function toggleAtivo(id: number, ativo: boolean) {
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, ativo } : c)));
    const r = await fetch(`/api/helpdesk/categorias/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo }),
    });
    if (!r.ok) { const data = await r.json(); setErro(data.error); carregar(); }
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Categorias de chamado</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Cada categoria define para qual setor o chamado é enviado ao ser aberto pelo assistente.
        Hoje o suporte técnico (nível 1) recebe os chamados de TI primeiro; use o campo &quot;Setor&quot;
        abaixo para direcionar uma categoria direto a outro setor quando fizer sentido.
      </p>
      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <form onSubmit={criar} className="grid gap-3 sm:grid-cols-5 mb-8 border rounded-lg p-4">
        <input required className="rounded-md border px-3 py-2 text-sm" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input required className="rounded-md border px-3 py-2 text-sm" placeholder="Categoria pai" value={pai} onChange={(e) => setPai(e.target.value)} />
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Subcategoria (opcional)" value={filho} onChange={(e) => setFilho(e.target.value)} />
        <select className="rounded-md border px-3 py-2 text-sm" value={area} onChange={(e) => setArea(e.target.value as TipoChamado | '')}>
          <option value="">Setor não definido</option>
          {TIPOS_CHAMADO.map((t) => <option key={t} value={t}>{TIPO_CHAMADO_META[t].label}</option>)}
        </select>
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Adicionar</button>
      </form>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {carregando ? 'Carregando...' : `${visiveis.length} categoria(s)`}
        </span>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={mostrarInativas} onChange={(e) => setMostrarInativas(e.target.checked)} />
          Mostrar inativas
        </label>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Categoria</th>
            <th className="py-2">Setor de destino</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {visiveis.map((c) => (
            <tr key={c.id} className={`border-b ${c.ativo ? '' : 'opacity-50'}`}>
              <td className="py-2">{c.filho ? `${c.pai} > ${c.filho}` : c.pai}{!c.ativo && <span className="ml-2 text-xs text-muted-foreground">(inativa)</span>}</td>
              <td className="py-2">
                <select
                  className="rounded-md border px-2 py-1 text-sm"
                  value={c.area ?? ''}
                  onChange={(e) => atualizarArea(c.id, e.target.value as TipoChamado | '')}
                  disabled={!c.ativo}
                >
                  <option value="">Não definido</option>
                  {TIPOS_CHAMADO.map((t) => <option key={t} value={t}>{TIPO_CHAMADO_META[t].label}</option>)}
                </select>
              </td>
              <td className="py-2">{c.ativo ? 'Ativa' : 'Inativa'}</td>
              <td className="py-2 text-right">
                <button type="button" className="text-xs underline" onClick={() => toggleAtivo(c.id, !c.ativo)}>
                  {c.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
