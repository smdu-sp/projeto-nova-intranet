'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CampoBuscaUsuario } from '../campo-busca-usuario';

type Sistema = {
  id: number;
  codigo: string;
  nome: string;
  permissoes: Array<{ id: number; nome: string; descricao?: string | null }>;
};

type Unidade = { id: string; nome: string; sigla: string; raiz: string; codigo: string };

type UsuarioLocal = {
  id: string;
  nome: string;
  login: string;
  email?: string;
  coordenadoriaId?: string | null;
};

export function FormSolicitacaoAcesso({
  usuarioLogado,
}: {
  usuarioLogado: UsuarioLocal;
}) {
  const router = useRouter();
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [ehPontoFocal, setEhPontoFocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [paraSiMesmo, setParaSiMesmo] = useState(true);
  const [nomeBeneficiario, setNomeBeneficiario] = useState(usuarioLogado.nome);
  const [rfBeneficiario, setRfBeneficiario] = useState(usuarioLogado.login);
  const [beneficiarioUsuarioId, setBeneficiarioUsuarioId] = useState<string | null>(usuarioLogado.id);
  const [sistemaId, setSistemaId] = useState('');
  const [permissaoId, setPermissaoId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    fetch('/api/helpdesk/acesso-sistemas/catalogo')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setSistemas(data.sistemas ?? []);
        setUnidades(data.unidades ?? []);
        setEhPontoFocal(!!data.ehPontoFocal);
        if (data.unidadesPontoFocal?.length === 1) {
          setUnidadeId(data.unidadesPontoFocal[0].id);
        }
      })
      .catch(e => setErro(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (paraSiMesmo) {
      setNomeBeneficiario(usuarioLogado.nome);
      setRfBeneficiario(usuarioLogado.login);
      setBeneficiarioUsuarioId(usuarioLogado.id);
    } else {
      setNomeBeneficiario('');
      setRfBeneficiario('');
      setBeneficiarioUsuarioId(null);
    }
  }, [paraSiMesmo, usuarioLogado]);

  const permissoesDoSistema = useMemo(() => {
    const s = sistemas.find(x => String(x.id) === sistemaId);
    return s?.permissoes ?? [];
  }, [sistemas, sistemaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch('/api/helpdesk/acesso-sistemas/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paraSiMesmo,
          nomeBeneficiario,
          rfBeneficiario,
          beneficiarioUsuarioId,
          sistemaId: Number(sistemaId),
          permissaoId: Number(permissaoId),
          unidadeId,
          observacao: observacao.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      router.push(`/helpdesk/chamados/${data.chamado.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-6">Carregando formulário...</p>;
  }

  if (!ehPontoFocal) {
    return (
      <div className="p-6 max-w-xl">
        <h1 className="text-xl font-bold mb-2">Solicitação de acesso a sistemas</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Somente usuários nomeados como <strong>ponto focal</strong> da unidade podem abrir solicitações nesta área.
          Entre em contato com a equipe de liberação de acesso caso precise ser cadastrado.
        </p>
        <Link href="/helpdesk/chamados/acesso-sistemas" className="text-sm text-primary underline">
          Voltar para chamados
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/helpdesk/chamados/acesso-sistemas" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold mt-2">Nova solicitação de acesso</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sistemas: SISACOE, SEI, APROVA DIGITAL, SLCE, PORTAL DE LICENCIAMENTO e SIMPROC.
          O coordenador/diretor será notificado por e-mail e poderá negar a solicitação.
        </p>
      </div>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">Para quem é a solicitação?</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={paraSiMesmo} onChange={() => setParaSiMesmo(true)} />
            Para mim
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={!paraSiMesmo} onChange={() => setParaSiMesmo(false)} />
            Para outra pessoa
          </label>
          {!paraSiMesmo && (
            <div className="pt-2">
              <label className="text-sm font-medium">Buscar servidor</label>
              <CampoBuscaUsuario
                value={beneficiarioUsuarioId ?? ''}
                onChange={(id) => {
                  setBeneficiarioUsuarioId(id || null);
                  if (!id) {
                    setNomeBeneficiario('');
                    setRfBeneficiario('');
                  }
                }}
                onSelecionar={(u) => {
                  setNomeBeneficiario(u.nome);
                  setRfBeneficiario(u.login);
                }}
                nomeInicial={nomeBeneficiario || undefined}
                placeholder="Digite o nome ou login do servidor..."
                coordenadoriaId={usuarioLogado.coordenadoriaId}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Apenas servidores da sua coordenadoria podem ser selecionados.
              </p>
            </div>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <input
              required
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={nomeBeneficiario}
              onChange={e => setNomeBeneficiario(e.target.value)}
              readOnly={paraSiMesmo}
            />
          </div>
          <div>
            <label className="text-sm font-medium">RF *</label>
            <input
              required
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={rfBeneficiario}
              onChange={e => setRfBeneficiario(e.target.value)}
              readOnly={paraSiMesmo}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Unidade / Coordenadoria *</label>
          <select
            required
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={unidadeId}
            onChange={e => setUnidadeId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Sistema *</label>
          <select
            required
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={sistemaId}
            onChange={e => { setSistemaId(e.target.value); setPermissaoId(''); }}
          >
            <option value="">Selecione...</option>
            {sistemas.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Tipo de permissão *</label>
          <select
            required
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={permissaoId}
            onChange={e => setPermissaoId(e.target.value)}
            disabled={!sistemaId}
          >
            <option value="">Selecione...</option>
            {permissoesDoSistema.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Observação</label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Informações adicionais para o responsável pela unidade..."
          />
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {salvando ? 'Enviando...' : 'Abrir solicitação'}
        </button>
      </form>
    </div>
  );
}
