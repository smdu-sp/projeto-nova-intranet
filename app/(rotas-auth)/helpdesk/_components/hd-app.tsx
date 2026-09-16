'use client';

import { Fragment, useState, useMemo, useRef, useEffect, type ReactNode } from 'react';
import {
  buildUnidadeOptions,
  buildUsuarioOptions,
  InventarioItemAcoes,
  PatrimonioNovoItemButton,
} from './item-patrimonio/inventario-acoes';
import { ViewTermos } from './termos-patrimonio/view-termos';
import { ViewNovoChamadoAssistente } from './wizard-abertura-chamado';
import { useHideAppSidebar } from '@/components/sidebar/sidebar-visibility';
import type { BaixaPatrimonio, Chamado, ItemPatrimonio, StatusHistoricoPatrimonio, Transferencia, StatusChamado, Prioridade, TipoEvento, Mensagem, Anexo, Usuario, Unidade, Categoria, TipoChamado } from '../_types';
import { STATUS_META, PRIORIDADE_META, TIPO_CHAMADO_META, TIPOS_CHAMADO, labelTipoChamado, exigeComputadorNaAbertura } from '../_types';
import { categoriaCompativelComArea } from '@/lib/helpdesk/tipos-chamado';
import { formatEventoHistorico } from '@/lib/helpdesk/eventos';
import { metaStatusItem, normalizarStatusItem } from '@/lib/helpdesk/item-patrimonio';
import { FILTROS_STATUS_INVENTARIO } from '@/lib/helpdesk/status-historico-patrimonio';
import { isMensagemMotivoProdam } from '@/lib/helpdesk/prodam';
import { formatarDuracaoMs, metricasTempoAtendimento } from '@/lib/helpdesk/tempo-atendimento';
import type { CapacidadesHelpdesk } from '@/lib/permissoes';
import {
  ITENS,
  fmtData,
  fmtDataCurta,
  tempoRelativo,
  GLPI_SOLUCAO,
  isMensagemSolucao,
  iniciais,
  nomePrimeiroUltimo,
} from '../_data/constants';

function itemPorIdFrom(itens: ItemPatrimonio[], id: number): ItemPatrimonio | null {
  return itens.find(i => i.idbem === id) ?? null;
}

function textoMarcaModelo(item: Pick<ItemPatrimonio, 'tipo' | 'marca' | 'modelo'>): string {
  return [item.tipo, item.marca, item.modelo].filter(Boolean).join(' ') || '—';
}

function rotuloEquipamentoTransferencia(item: ItemPatrimonio | null): string {
  if (!item) return '—';
  const marcaModelo = textoMarcaModelo(item);
  if (marcaModelo !== '—') return marcaModelo;
  return item.descsbpm || '—';
}

function isTipoComputador(tipo: string | null | undefined): boolean {
  return (tipo ?? '').trim().toLowerCase() === 'computador';
}

function horasDesde(dataIso?: string): string {
  if (!dataIso) return '—';
  const inicio = new Date(dataIso).getTime();
  if (Number.isNaN(inicio)) return '—';
  const diffMs = Date.now() - inicio;
  if (diffMs <= 0) return '0h 00min';
  const totalMin = Math.floor(diffMs / 60000);
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;
  return `${horas}h ${String(minutos).padStart(2, '0')}min`;
}

function inicioAguardandoProdam(chamado: Chamado): string | undefined {
  const eventoProdam = [...chamado.eventos]
    .reverse()
    .find(e => e.tipo === 'statusAlterado' && e.texto.toLowerCase().includes('prodam'));
  return eventoProdam?.data;
}

function renderEstrelas(nota?: number): string {
  if (!nota || nota < 1 || nota > 5) return '—';
  return `${'★'.repeat(nota)}${'☆'.repeat(5 - nota)}`;
}

function prazoConfirmacaoTexto(chamado: Chamado): string | null {
  if (chamado.status !== 'resolvido' || !chamado.prazoConfirmacao) return null;
  const prazo = new Date(chamado.prazoConfirmacao).getTime();
  if (Number.isNaN(prazo)) return null;
  const diff = prazo - Date.now();
  if (diff <= 0) return 'Prazo de confirmação expirado';
  const dias = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `Prazo para confirmação: ${dias} dia(s)`;
}

function isUsuarioStaff(u: Usuario): boolean {
  return u.perfil === 'ADM' || u.perfil === 'TEC' || u.permissao === 1 || u.permissao === 2;
}

const CAPACIDADES_VAZIAS: CapacidadesHelpdesk = {
  atenderChamados: false,
  abrirChamados: false,
  patrimonio: false,
  unidades: false,
  relatorios: false,
  gerenciarAcessoSistemas: false,
  gerenciarCategorias: false,
};

export function resolveCategoriaId(categorias: Categoria[], pai: string, filho: string): number | null {
  if (filho) {
    return categorias.find(c => c.pai === pai && c.filho === filho)?.id ?? null;
  }
  return categorias.find(c => c.pai === pai && !c.filho)?.id ?? null;
}

async function uploadAnexosChamado(
  chamadoId: number,
  files: File[],
  mensagemId?: number | null
) {
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    if (mensagemId) fd.append('mensagemId', String(mensagemId));
    const r = await fetch(`/api/helpdesk/chamados/${chamadoId}/anexos`, {
      method: 'POST',
      body: fd,
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error(data?.error ?? `Falha ao enviar anexo (${r.status})`);
    }
  }
}

// ─── Helpers & shared styles ────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E8EBF1',
  borderRadius: 14,
  boxShadow: '0 1px 3px rgba(20,30,55,0.04)',
  padding: 20,
};

const TABLE_TH: React.CSSProperties = {
  background: '#FAFBFD',
  fontSize: 11,
  fontWeight: 700,
  color: '#7A8499',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '10px 14px',
  whiteSpace: 'nowrap',
};

const BTN_PRIMARY: React.CSSProperties = {
  background: '#0A328D',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '8px 18px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const BTN_GHOST: React.CSSProperties = {
  background: 'transparent',
  color: '#4A5468',
  border: '1px solid #E8EBF1',
  borderRadius: 10,
  padding: '8px 16px',
  fontWeight: 500,
  fontSize: 14,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  border: '1px solid #E8EBF1',
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 14,
  color: '#1B2336',
  background: '#fff',
  outline: 'none',
  width: '100%',
};

const LABEL: React.CSSProperties = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 };

function StatusBadge({ status }: { status: StatusChamado }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.corBg, color: m.corText,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.cor, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  const m = PRIORIDADE_META[prioridade];
  return (
    <span style={{
      background: m.corBg, color: m.corText,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {m.label}
    </span>
  );
}

function Avatar({ nome, size = 32, bg = '#0A328D' }: { nome: string; size?: number; bg?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#fff', fontSize: size * 0.38, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {iniciais(nome)}
    </div>
  );
}

function UsuarioInfoLinha({
  tipo, texto, href,
}: {
  tipo: 'email' | 'telefone' | 'unidade';
  texto: string;
  href?: string;
}) {
  const iconPaths: Record<typeof tipo, ReactNode> = {
    email: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8499" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 7 10-7" />
      </svg>
    ),
    telefone: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8499" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
    unidade: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A8499" strokeWidth="2">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-3" />
      </svg>
    ),
  };

  const conteudo = href ? (
    <a href={href} style={{ fontSize: 12, color: '#0A328D', textDecoration: 'none', wordBreak: 'break-all' }}
      onClick={e => e.stopPropagation()}>
      {texto}
    </a>
  ) : (
    <span style={{ fontSize: 12, color: '#0A328D', wordBreak: 'break-word' }}>{texto}</span>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{iconPaths[tipo]}</span>
      {conteudo}
    </div>
  );
}

/** Nome na tabela + ícone “i” com card de informações ao passar o mouse (estilo GLPI). */
function UsuarioInfoPopover({ usuario, unidade }: { usuario: Usuario; unidade?: string }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%' }}
      onClick={e => e.stopPropagation()}
    >
      <span
        style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={usuario.nome}
      >
        {nomePrimeiroUltimo(usuario.nome)}
      </span>
      <div
        style={{ position: 'relative', flexShrink: 0 }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          aria-label={`Informações de ${usuario.nome}`}
          style={{
            width: 16, height: 16, padding: 0, border: 'none', background: 'transparent',
            color: '#0A328D', fontSize: 13, fontWeight: 700, fontStyle: 'italic',
            cursor: 'help', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          i
        </button>
        {hover && (
          <>
            <div style={{
              position: 'absolute', left: 4, top: '100%', zIndex: 201,
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #D0D5DD',
            }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 5px)', left: -8, zIndex: 200,
              minWidth: 300, maxWidth: 360, background: '#fff', border: '1px solid #D0D5DD',
              borderRadius: 6, boxShadow: '0 4px 14px rgba(20,30,55,0.14)',
              padding: 12, display: 'flex', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 4, background: '#D4B896',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#4A5468', flexShrink: 0,
              }}>
                {iniciais(usuario.nome)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1B2336', marginBottom: 8, lineHeight: 1.35 }}>
                  {usuario.nome}
                </div>
                <UsuarioInfoLinha tipo="email" texto={usuario.email} href={`mailto:${usuario.email}`} />
                <UsuarioInfoLinha tipo="telefone" texto={usuario.telefone?.trim() || '—'} />
                <UsuarioInfoLinha tipo="unidade" texto={unidade?.trim() || '—'} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, cor, sub }: { label: string; value: number | string; cor: string; sub?: string }) {
  return (
    <div style={{ ...CARD_STYLE, borderLeft: `5px solid ${cor}`, padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: '#7A8499', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1B2336', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#7A8499', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
      <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1B2336" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input
        style={{ ...INPUT_STYLE, paddingLeft: 32 }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
      />
    </div>
  );
}

export function AutocompleteInput<T>({
  value, onChange, items, getLabel, getKey, placeholder, renderItem,
}: {
  value: T | null;
  onChange: (v: T | null) => void;
  items: T[];
  getLabel: (v: T) => string;
  getKey: (v: T) => string | number;
  placeholder?: string;
  renderItem?: (v: T) => React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    return items.filter(i => getLabel(i).toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  }, [query, items, getLabel]);

  const displayValue = value ? getLabel(value) : '';

  function handleInput(v: string) {
    setQuery(v);
    if (v !== displayValue) onChange(null);
    setOpen(true);
  }

  function handleSelect(item: T) {
    onChange(item);
    setQuery(getLabel(item));
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={INPUT_STYLE}
        value={value ? displayValue : query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Digite para pesquisar...'}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #E8EBF1', borderRadius: 10,
          boxShadow: '0 4px 16px rgba(20,30,55,0.10)', marginTop: 4, maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(item => (
            <div
              key={getKey(item)}
              onMouseDown={() => handleSelect(item)}
              style={{
                padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid #F2F4F8',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              {renderItem ? renderItem(item) : getLabel(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Atores do chamado (estilo GLPI) ─────────────────────────────────────────

function ActorTag({
  nome, onRemove, readOnly, disabled,
}: {
  nome: string;
  onRemove?: () => void;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const podeRemover = !readOnly && !!onRemove;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#F2F4F8', border: '1px solid #E8EBF1', borderRadius: 6,
      padding: '4px 6px 4px 4px', fontSize: 12, fontWeight: 600, color: '#1B2336',
      maxWidth: '100%',
    }}>
      <Avatar nome={nome} size={20} bg="#7A8499" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{nome}</span>
      {podeRemover && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          title="Remover"
          aria-label={`Remover ${nome}`}
          style={{
            width: 20, height: 20, border: 'none', borderRadius: 4,
            background: disabled ? 'transparent' : '#E8EBF1',
            color: disabled ? '#C5CDDB' : '#4A5468',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700, lineHeight: 1, padding: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

function CampoAtores({
  label, obrigatorio, ids, usuarios, usuarioPorId, candidatos, readOnly, disabled,
  onChange, multi, headerExtra,
}: {
  label: string;
  obrigatorio?: boolean;
  ids: number[];
  usuarios: Usuario[];
  usuarioPorId: (id: number) => Usuario | null;
  candidatos: Usuario[];
  readOnly?: boolean;
  disabled?: boolean;
  multi?: boolean;
  headerExtra?: React.ReactNode;
  onChange: (ids: number[]) => void;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);

  const idsSet = new Set(ids);
  const disponiveis = candidatos.filter(u => !idsSet.has(u.id));

  function adicionar(u: Usuario) {
    if (multi) {
      onChange([...ids, u.id]);
    } else {
      onChange([u.id]);
    }
    setSelecionado(null);
    setAdicionando(false);
  }

  function remover(id: number) {
    if (obrigatorio && ids.length <= 1) {
      onChange([]);
      if (!multi) setAdicionando(true);
      return;
    }
    onChange(ids.filter(i => i !== id));
  }

  const podeAdicionar = !readOnly && !disabled && (multi ? disponiveis.length > 0 : ids.length === 0);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <label style={{ ...LABEL, marginBottom: 0 }}>
          {label}
          {obrigatorio && <span style={{ color: '#C0392B', marginLeft: 2 }}>*</span>}
        </label>
        {headerExtra}
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
        minHeight: 38, padding: '6px 8px', border: '1px solid #E8EBF1', borderRadius: 8,
        background: disabled ? '#FAFBFD' : '#fff',
      }}>
        {ids.map(id => {
          const u = usuarioPorId(id);
          if (!u) return null;
          return (
            <ActorTag
              key={id}
              nome={u.nome}
              readOnly={readOnly}
              disabled={disabled}
              onRemove={readOnly ? undefined : () => remover(id)}
            />
          );
        })}
        {ids.length === 0 && readOnly && (
          <span style={{ fontSize: 12, color: '#7A8499' }}>—</span>
        )}
        {podeAdicionar && !adicionando && (
          <button type="button" onClick={() => setAdicionando(true)} title={`Adicionar ${label.toLowerCase()}`}
            style={{
              width: 28, height: 28, border: '1px dashed #C5CDDB', borderRadius: 6,
              background: 'transparent', color: '#0A328D', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        )}
      </div>
      {adicionando && podeAdicionar && (
        <div style={{ marginTop: 6 }}>
          <AutocompleteInput
            value={selecionado}
            onChange={u => { if (u) adicionar(u); else setSelecionado(null); }}
            items={disponiveis}
            getLabel={u => u.nome}
            getKey={u => u.id}
            placeholder="Buscar usuário..."
          />
          <button type="button" onClick={() => { setAdicionando(false); setSelecionado(null); }}
            style={{ ...BTN_GHOST, marginTop: 4, padding: '3px 10px', fontSize: 11 }}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

function SecaoAtoresChamado({
  chamado, usuarios, usuarioPorId, usuarioLogadoId, isTecnico, isClosed, onAtualizado,
}: {
  chamado: Chamado;
  usuarios: Usuario[];
  usuarioPorId: (id: number) => Usuario | null;
  usuarioLogadoId: number | null;
  isTecnico: boolean;
  isClosed: boolean;
  onAtualizado: (c: Chamado) => void;
}) {
  const [aberto, setAberto] = useState(true);
  const [solicitanteId, setSolicitanteId] = useState<number | null>(chamado.solicitante);
  const [tecnicos, setTecnicos] = useState(chamado.tecnicos);
  const [observadores, setObservadores] = useState(chamado.observadores);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const editavel = isTecnico && !isClosed;
  const usuariosAtivos = useMemo(() => usuarios.filter(u => u.statususer === 'Ativo'), [usuarios]);
  const usuariosStaff = useMemo(
    () => usuariosAtivos.filter(isUsuarioStaff),
    [usuariosAtivos],
  );

  const usuarioPorIdStaff = (id: number): Usuario | null => {
    const u = usuarioPorId(id);
    return u && isUsuarioStaff(u) ? u : null;
  };

  const tecnicosVisiveis = useMemo(
    () => tecnicos.filter(id => usuarioPorIdStaff(id) != null),
    [tecnicos, usuarios],
  );

  useEffect(() => {
    setSolicitanteId(chamado.solicitante);
    setTecnicos(chamado.tecnicos);
    setObservadores(chamado.observadores);
    setErro(null);
  }, [chamado.id, chamado.solicitante, chamado.tecnicos, chamado.observadores]);

  const totalAtores = (solicitanteId ? 1 : 0) + tecnicosVisiveis.length + observadores.length;

  async function persistir(patch: {
    solicitanteId?: number;
    tecnicoIds?: number[];
    observadorIds?: number[];
  }) {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/helpdesk/chamados/${chamado.id}/atores`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        onAtualizado(data.chamado);
        setSolicitanteId(data.chamado.solicitante);
        setTecnicos(data.chamado.tecnicos);
        setObservadores(data.chamado.observadores);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setSolicitanteId(chamado.solicitante);
      setTecnicos(chamado.tecnicos);
      setObservadores(chamado.observadores);
    } finally {
      setSalvando(false);
    }
  }

  function alterarRequerente(ids: number[]) {
    const id = ids[0];
    if (!id) {
      setSolicitanteId(null);
      return;
    }
    if (id === solicitanteId) return;
    setSolicitanteId(id);
    persistir({ solicitanteId: id });
  }

  function alterarTecnicos(ids: number[]) {
    const idsStaff = ids.filter(id => usuarioPorIdStaff(id) != null);
    setTecnicos(idsStaff);
    persistir({ tecnicoIds: idsStaff });
  }

  function alterarObservadores(ids: number[]) {
    setObservadores(ids);
    persistir({ observadorIds: ids });
  }

  function atribuirAMim() {
    if (!usuarioLogadoId || tecnicosVisiveis.includes(usuarioLogadoId)) return;
    const eu = usuarioPorIdStaff(usuarioLogadoId);
    if (!eu) return;
    alterarTecnicos([...tecnicosVisiveis, usuarioLogadoId]);
  }

  const jaAtribuidoAMim = usuarioLogadoId != null && tecnicosVisiveis.includes(usuarioLogadoId);

  const sol = solicitanteId != null ? usuarioPorId(solicitanteId) : null;
  const telefone = chamado.telefone || sol?.telefone;

  return (
    <div style={CARD_STYLE}>
      <button type="button" onClick={() => setAberto(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: aberto ? 14 : 0,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1B2336' }}>Atores</span>
          <span style={{
            background: '#0A328D', color: '#fff', fontSize: 11, fontWeight: 700,
            borderRadius: 10, padding: '1px 7px', minWidth: 20, textAlign: 'center',
          }}>
            {totalAtores}
          </span>
          {salvando && <span style={{ fontSize: 11, color: '#7A8499' }}>Salvando...</span>}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A8499" strokeWidth="2"
          style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <>
          {erro && (
            <div style={{ background: '#FBDADA', border: '1px solid #F5AAAA', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#7A1F1F' }}>
              {erro}
            </div>
          )}
          {!editavel && isClosed && (
            <div style={{ fontSize: 12, color: '#7A8499', marginBottom: 10 }}>
              Chamado fechado — atores não podem ser alterados.
            </div>
          )}

          <CampoAtores
            label="Requerente"
            obrigatorio
            ids={solicitanteId ? [solicitanteId] : []}
            usuarios={usuarios}
            usuarioPorId={usuarioPorId}
            candidatos={usuariosAtivos}
            readOnly={!editavel}
            disabled={salvando}
            multi={false}
            onChange={alterarRequerente}
          />

          {telefone && (
            <div style={{ fontSize: 12, color: '#7A8499', marginTop: -8, marginBottom: 12, paddingLeft: 2 }}>
              Telefone: <span style={{ fontWeight: 600, color: '#4A5468' }}>{telefone}</span>
            </div>
          )}

          <CampoAtores
            label="Observador"
            ids={observadores}
            usuarios={usuarios}
            usuarioPorId={usuarioPorId}
            candidatos={usuariosAtivos.filter(u => u.id !== solicitanteId)}
            readOnly={!editavel}
            disabled={salvando}
            multi
            onChange={alterarObservadores}
          />

          <CampoAtores
            label="Atribuído"
            ids={tecnicosVisiveis}
            usuarios={usuariosStaff}
            usuarioPorId={usuarioPorIdStaff}
            candidatos={usuariosStaff}
            readOnly={!editavel}
            disabled={salvando}
            multi
            onChange={alterarTecnicos}
            headerExtra={editavel && usuarioLogadoId ? (
              <button
                type="button"
                onClick={atribuirAMim}
                disabled={salvando || jaAtribuidoAMim}
                title={jaAtribuidoAMim ? 'Você já está atribuído a este chamado' : 'Atribuir este chamado a você'}
                style={{
                  ...BTN_GHOST,
                  padding: '3px 10px',
                  fontSize: 11,
                  color: jaAtribuidoAMim ? '#7A8499' : '#0A328D',
                  borderColor: jaAtribuidoAMim ? '#E8EBF1' : '#0A328D',
                  opacity: salvando ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Atribuir a mim
              </button>
            ) : undefined}
          />
        </>
      )}
    </div>
  );
}

function DonutChart({ segments, total, size = 140 }: { segments: { nome: string; valor: number; cor: string }[]; total: number; size?: number }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let acumulado = 0;
  const totalReal = segments.reduce((s, x) => s + x.valor, 0) || 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2F4F8" strokeWidth="18" />
      {segments.map((s, i) => {
        const frac = s.valor / totalReal;
        const dash = c * frac;
        const gap = c - dash;
        const offset = -acumulado * c;
        acumulado += frac;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.cor} strokeWidth="18"
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
      })}
      <text x="50%" y="46%" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1B2336" fontFamily="Inter, sans-serif">{total}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="11" fill="#7A8499" fontFamily="Inter, sans-serif">itens</text>
    </svg>
  );
}

type View = 'dashboard' | 'chamados' | 'chamado-detalhe' | 'novo-chamado' | 'novo-chamado-assistente' | 'inventario' | 'item-detalhe' | 'movimentacoes' | 'nova-transferencia' | 'termos' | 'usuarios' | 'relatorios';
type AbaMovimentacao = 'transferencia' | 'baixa' | 'status';

interface HdAppProps {
  initialView?: View;
  initialId?: number;
  initialArea?: TipoChamado;
  initialAbaMovimentacao?: AbaMovimentacao;
}

// ─── Main HdApp Component ─────────────────────────────────────────────────────

export function HdApp({ initialView = 'dashboard', initialId, initialArea, initialAbaMovimentacao }: HdAppProps) {
  const [view, setView] = useState<View>(initialView);
  const [activeId, setActiveId] = useState<number | undefined>(initialId);
  const [areaContext, setAreaContext] = useState<TipoChamado | undefined>(initialArea);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [baixas, setBaixas] = useState<BaixaPatrimonio[]>([]);
  const [statusHistorico, setStatusHistorico] = useState<StatusHistoricoPatrimonio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<number | null>(null);
  const [perfilLogado, setPerfilLogado] = useState<'ADM' | 'TEC' | 'USR'>('USR');
  const [capacidades, setCapacidades] = useState<CapacidadesHelpdesk>(CAPACIDADES_VAZIAS);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasPai, setCategoriasPai] = useState<string[]>([]);
  const [itensPatrimonio, setItensPatrimonio] = useState<ItemPatrimonio[]>([]);
  const [numToUuid, setNumToUuid] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [erroApi, setErroApi] = useState<string | null>(null);

  useHideAppSidebar(view === 'novo-chamado-assistente');

  useEffect(() => {
    fetch('/api/helpdesk/chamados')
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        return data;
      })
      .then((data) => {
        setChamados(data.chamados ?? []);
        setUsuarios(data.usuarios ?? []);
        setUsuarioLogadoId(data.usuarioLogadoId ?? null);
        setPerfilLogado(data.perfilLogado ?? 'USR');
        setCapacidades(data.capacidades ?? CAPACIDADES_VAZIAS);
        setUnidades(data.unidades ?? []);
        setCategorias(data.categorias ?? []);
        setCategoriasPai(data.categoriasPai ?? []);
        setItensPatrimonio(data.itens ?? []);
        setTransferencias(data.transferencias ?? []);
        setBaixas(data.baixas ?? []);
        setStatusHistorico(data.statusHistorico ?? []);
        setNumToUuid(data.numToUuid ?? {});
      })
      .catch(err => setErroApi(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const usuarioPorIdLocal = (id: number): Usuario | null =>
    usuarios.find(u => u.id === id) ?? null;

  function navTo(v: View, id?: number) {
    setView(v);
    if (id !== undefined) setActiveId(id);
  }

  const viewProps = {
    view, navTo, chamados, setChamados, transferencias, setTransferencias, baixas, statusHistorico, activeId,
    usuarios, usuarioPorId: usuarioPorIdLocal, usuarioLogadoId, perfilLogado, capacidades,
    unidades, categorias, categoriasPai, itensPatrimonio, numToUuid, initialAbaMovimentacao,
    areaFiltro: areaContext,
    setAreaContext,
  };

  if (loading) return (
    <div style={{ minHeight: '100%', background: '#F4F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#7A8499', fontSize: 15 }}>
      Carregando chamados...
    </div>
  );

  if (erroApi) return (
    <div style={{ minHeight: '100%', background: '#F4F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#C0392B', fontSize: 15 }}>
      Erro ao carregar dados: {erroApi}
    </div>
  );

  return (
    <div style={{ minHeight: '100%', background: '#F4F5F9', fontFamily: 'Inter, system-ui, sans-serif', color: '#1B2336' }}>
      {view === 'dashboard' && <ViewDashboard {...viewProps} />}
      {view === 'chamados' && <ViewChamados {...viewProps} />}
      {view === 'chamado-detalhe' && <ViewChamadoDetalhe {...viewProps} />}
      {view === 'novo-chamado' && <ViewNovoChamado {...viewProps} />}
      {view === 'novo-chamado-assistente' && <ViewNovoChamadoAssistente {...viewProps} />}
      {view === 'inventario' && capacidades.patrimonio && <ViewInventario {...viewProps} />}
      {view === 'item-detalhe' && capacidades.patrimonio && <ViewItemDetalhe {...viewProps} />}
      {view === 'movimentacoes' && capacidades.patrimonio && <ViewMovimentacoes {...viewProps} />}
      {view === 'nova-transferencia' && capacidades.patrimonio && <ViewNovaTransferencia {...viewProps} />}
      {view === 'termos' && capacidades.patrimonio && <ViewTermos itensPatrimonio={itensPatrimonio} />}
      {view === 'usuarios' && <ViewUsuarios {...viewProps} />}
      {view === 'relatorios' && <ViewRelatorios {...viewProps} />}
    </div>
  );
}

// ─── Shared props type ────────────────────────────────────────────────────────

interface ViewProps {
  view: View;
  navTo: (v: View, id?: number) => void;
  chamados: Chamado[];
  setChamados: React.Dispatch<React.SetStateAction<Chamado[]>>;
  transferencias: Transferencia[];
  setTransferencias: React.Dispatch<React.SetStateAction<Transferencia[]>>;
  baixas: BaixaPatrimonio[];
  statusHistorico: StatusHistoricoPatrimonio[];
  activeId?: number;
  usuarios: Usuario[];
  usuarioPorId: (id: number) => Usuario | null;
  usuarioLogadoId: number | null;
  perfilLogado: 'ADM' | 'TEC' | 'USR';
  capacidades: CapacidadesHelpdesk;
  unidades: Unidade[];
  categorias: Categoria[];
  categoriasPai: string[];
  itensPatrimonio: ItemPatrimonio[];
  numToUuid: Record<string, string>;
  initialAbaMovimentacao?: AbaMovimentacao;
  areaFiltro?: TipoChamado;
  setAreaContext?: React.Dispatch<React.SetStateAction<TipoChamado | undefined>>;
}

// ─── Page header ─────────────────────────────────────────────────────────────

function StatusItemBadge({ status }: { status: string }) {
  const meta = metaStatusItem(status);
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
      background: meta.corBg, color: meta.corText,
    }}>
      {normalizarStatusItem(status)}
    </span>
  );
}

function AreaBadge({ area }: { area: TipoChamado }) {
  const meta = TIPO_CHAMADO_META[area];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
      background: meta.corBg, color: meta.corText,
      border: '1px solid transparent',
    }}>
      {meta.label}
    </span>
  );
}

function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1B2336', margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: '#7A8499', margin: '4px 0 0' }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── VIEW: Dashboard ──────────────────────────────────────────────────────────

function ViewDashboard({ navTo, chamados, transferencias, usuarioPorId, capacidades }: ViewProps) {
  const abertos = chamados.filter(c => c.status === 'aberto').length;
  const emAtend = chamados.filter(c => c.status === 'atendimento').length;
  const aguard = chamados.filter(c => c.status === 'aguardando').length;
  const aguardandoProdam = chamados.filter(c => c.status === 'prodam').length;
  const resolvidos = chamados.filter(c => c.status === 'resolvido' || c.status === 'fechado').length;

  const catCount: Record<string, number> = {};
  chamados.forEach(c => {
    const p = c.categoria.split(' > ')[0];
    catCount[p] = (catCount[p] || 0) + 1;
  });
  const catTop = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMax = catTop[0]?.[1] || 1;

  const recentes = [...chamados].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard"
        sub="Visão geral do suporte técnico"
        action={
          <button style={BTN_PRIMARY} onClick={() => navTo('novo-chamado-assistente')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo Chamado
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Novos" value={abertos} cor="#5CC9BD" sub="Aguardando atribuição" />
        <KpiCard label="Em atendimento" value={emAtend} cor="#E56E14" sub="Em andamento" />
        <KpiCard label="Aguardando" value={aguard} cor="#EDBA94" sub="Aguardando resposta" />
        <KpiCard label="Aguardando PRODAM" value={aguardandoProdam} cor="#9A68C0" sub="Dependência externa" />
        <KpiCard label="Resolvidos" value={resolvidos} cor="#0A328D" sub="Encerrados" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Recent tickets */}
        <div style={CARD_STYLE}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Chamados Recentes</span>
            <button style={{ ...BTN_GHOST, padding: '5px 12px', fontSize: 12 }} onClick={() => navTo('chamados')}>Ver todos</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Título', 'Status', 'Prioridade', 'Abertura'].map(h => (
                  <th key={h} style={{ ...TABLE_TH, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentes.map((c, i) => (
                <tr key={c.id} style={{ borderTop: '1px solid #F2F4F8', cursor: 'pointer' }}
                  onClick={() => navTo('chamado-detalhe', c.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFD')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#0A328D', fontWeight: 700 }}>#{c.id}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{c.titulo}</div>
                    <div style={{ fontSize: 11, color: '#7A8499' }}>{c.unidade}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '10px 14px' }}><PrioridadeBadge prioridade={c.prioridade} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499', whiteSpace: 'nowrap' }}>{fmtData(c.abertura)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Category bars */}
        <div style={CARD_STYLE}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Por Categoria</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {catTop.map(([cat, count]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#4A5468', fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontWeight: 700, color: '#1B2336' }}>{count}</span>
                </div>
                <div style={{ height: 6, background: '#F2F4F8', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(count / catMax) * 100}%`, height: '100%', background: '#0A328D', borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {capacidades.patrimonio && (
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Transferências Recentes</span>
          <button style={{ ...BTN_GHOST, padding: '5px 12px', fontSize: 12 }} onClick={() => navTo('movimentacoes')}>Ver todas</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {transferencias.slice(0, 4).map(t => {
            const reg = usuarioPorId(t.idUsuarioRegistro);
            return (
              <div key={t.id} style={{ ...CARD_STYLE, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A328D' }}>{t.cimbpm}</span>
                  <span style={{ fontSize: 11, color: '#7A8499' }}>{fmtDataCurta(t.dataTransferencia)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.unidadeDestino}</div>
                <div style={{ fontSize: 11, color: '#7A8499' }}>{t.itens.length} item(ns) · Por {reg?.nome || '—'}</div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

// ─── VIEW: Chamados ───────────────────────────────────────────────────────────

type TabChamadosUsuario = 'todos' | 'aberto' | 'em_andamento' | 'aguardando_nota' | 'resolvido' | 'fechado';
const STATUS_EM_ANDAMENTO: StatusChamado[] = ['atendimento', 'aguardando', 'aguardando_autorizacao', 'prodam'];

function chamadoAguardandoNota(c: Chamado): boolean {
  return c.status === 'fechado' && !c.avaliacao;
}

function matchFiltroChamadoUsuario(c: Chamado, tab: TabChamadosUsuario): boolean {
  if (tab === 'todos') return true;
  if (tab === 'aberto') return c.status === 'aberto';
  if (tab === 'em_andamento') return STATUS_EM_ANDAMENTO.includes(c.status);
  if (tab === 'aguardando_nota') return chamadoAguardandoNota(c);
  return c.status === tab;
}

function ViewChamados({ navTo, chamados, usuarioPorId, perfilLogado, areaFiltro }: ViewProps) {
  const isTecnico = perfilLogado === 'TEC' || perfilLogado === 'ADM';
  const areaMeta = areaFiltro ? TIPO_CHAMADO_META[areaFiltro] : null;
  const chamadosDaArea = useMemo(
    () => (areaFiltro ? chamados.filter(c => c.areaAtual === areaFiltro) : chamados),
    [chamados, areaFiltro],
  );
  const [search, setSearch] = useState('');
  const [tabTecnico, setTabTecnico] = useState<StatusChamado | 'abertos_atribuidos'>('abertos_atribuidos');
  const [tabUsuario, setTabUsuario] = useState<TabChamadosUsuario>('todos');
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const filtered = useMemo(() => {
    return chamadosDaArea.filter(c => {
      const matchSearch = !search || c.titulo.toLowerCase().includes(search.toLowerCase()) ||
        String(c.id).includes(search) || c.unidade.toLowerCase().includes(search.toLowerCase());
      const matchStatus = isTecnico
        ? tabTecnico === 'abertos_atribuidos'
          ? c.status === 'aberto' || c.status === 'atendimento'
          : c.status === tabTecnico
        : matchFiltroChamadoUsuario(c, tabUsuario);
      return matchSearch && matchStatus;
    });
  }, [chamadosDaArea, search, tabTecnico, tabUsuario, isTecnico]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [search, tabTecnico, tabUsuario, itensPorPagina, isTecnico]);

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / itensPorPagina));

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const chamadosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return filtered.slice(inicio, inicio + itensPorPagina);
  }, [filtered, paginaAtual, itensPorPagina]);

  const countsTecnico: Record<string, number> = {
    abertos_atribuidos: chamadosDaArea.filter(c => c.status === 'aberto' || c.status === 'atendimento').length,
  };
  (['aberto', 'atendimento', 'aguardando', 'aguardando_autorizacao', 'prodam', 'resolvido', 'fechado'] as StatusChamado[]).forEach(s => {
    countsTecnico[s] = chamadosDaArea.filter(c => c.status === s).length;
  });

  const countsUsuario: Record<TabChamadosUsuario, number> = {
    todos: chamadosDaArea.length,
    aberto: chamadosDaArea.filter(c => c.status === 'aberto').length,
    em_andamento: chamadosDaArea.filter(c => STATUS_EM_ANDAMENTO.includes(c.status)).length,
    aguardando_nota: chamadosDaArea.filter(chamadoAguardandoNota).length,
    resolvido: chamadosDaArea.filter(c => c.status === 'resolvido').length,
    fechado: chamadosDaArea.filter(c => c.status === 'fechado').length,
  };

  const tabsTecnico: Array<{ key: StatusChamado | 'abertos_atribuidos'; label: string }> = [
    { key: 'abertos_atribuidos', label: 'Novos + Atribuídos' },
    { key: 'aberto', label: 'Novos' },
    { key: 'atendimento', label: 'Em atendimento' },
    { key: 'aguardando', label: 'Aguardando' },
    { key: 'aguardando_autorizacao', label: 'Aguardando autorização' },
    { key: 'prodam', label: 'Aguardando PRODAM' },
    { key: 'resolvido', label: 'Resolvidos' },
    { key: 'fechado', label: 'Fechados' },
  ];

  const tabsUsuario: Array<{ key: TabChamadosUsuario; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'aberto', label: 'Novos' },
    { key: 'em_andamento', label: 'Em andamento' },
    { key: 'aguardando_nota', label: 'Aguardando nota' },
    { key: 'resolvido', label: 'Resolvidos' },
    { key: 'fechado', label: 'Fechados' },
  ];

  const tabs = isTecnico ? tabsTecnico : tabsUsuario;
  const tabAtiva = isTecnico ? tabTecnico : tabUsuario;
  const countTab = (key: string) =>
    isTecnico ? (countsTecnico[key] ?? 0) : (countsUsuario[key as TabChamadosUsuario] ?? 0);
  const setTabAtiva = (key: string) => {
    if (isTecnico) setTabTecnico(key as StatusChamado | 'abertos_atribuidos');
    else setTabUsuario(key as TabChamadosUsuario);
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title={areaMeta?.label ?? 'Chamados'}
        sub={areaMeta ? `${areaMeta.descricao} · ${chamadosDaArea.length} chamados nesta área` : `${chamadosDaArea.length} chamados no total`}
        action={
          areaFiltro === 'acesso_sistemas' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/helpdesk/chamados/acesso-sistemas/novo" style={{ ...BTN_PRIMARY, textDecoration: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Nova solicitação
              </a>
              <a href="/helpdesk/chamados/acesso-sistemas/autorizacoes" style={{ ...BTN_GHOST, textDecoration: 'none' }}>
                Autorizações
              </a>
            </div>
          ) : (
          <button style={BTN_PRIMARY} onClick={() => navTo('novo-chamado-assistente')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo Chamado
          </button>
          )
        }
      />

      {isTecnico && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard label="Novos + Atribuídos" value={countsTecnico.abertos_atribuidos || 0} cor="#5CC9BD" />
          <KpiCard label="Em atendimento" value={countsTecnico.atendimento || 0} cor="#E56E14" />
          <KpiCard label="Aguardando" value={countsTecnico.aguardando || 0} cor="#EDBA94" />
          <KpiCard label="Resolvidos + Fechados" value={(countsTecnico.resolvido || 0) + (countsTecnico.fechado || 0)} cor="#0A328D" />
        </div>
      )}

      <div style={CARD_STYLE}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1', marginBottom: 16, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTabAtiva(t.key)}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
                fontWeight: tabAtiva === t.key ? 700 : 500,
                color: tabAtiva === t.key ? '#0A328D' : '#7A8499',
                borderBottom: tabAtiva === t.key ? '2px solid #0A328D' : '2px solid transparent',
                marginBottom: -1,
              }}>
              {t.label}
              <span style={{ marginLeft: 5, fontSize: 11, background: tabAtiva === t.key ? '#D9E1F4' : '#F2F4F8', color: tabAtiva === t.key ? '#0A328D' : '#7A8499', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                {countTab(t.key)}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, alignItems: 'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por ID, título, unidade..." />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="itens-por-pagina" style={{ fontSize: 12, color: '#7A8499', whiteSpace: 'nowrap' }}>
              Itens por página
            </label>
            <select
              id="itens-por-pagina"
              value={itensPorPagina}
              onChange={e => setItensPorPagina(Number(e.target.value))}
              style={{ ...INPUT_STYLE, width: 92, padding: '8px 10px' }}
            >
              {[10, 20, 50, 100].map(opcao => (
                <option key={opcao} value={opcao}>{opcao}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                '#',
                'Título',
                'Categoria',
                'Status',
                'Prioridade',
                ...(isTecnico ? ['Solicitante'] : []),
                'Técnico',
                'Abertura',
                'Data de solução',
                ...(isTecnico ? ['Horas PRODAM'] : []),
                ...(!isTecnico ? ['Avaliação'] : []),
              ].map(h => (
                <th key={h} style={{ ...TABLE_TH, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={isTecnico ? 10 : 9} style={{ textAlign: 'center', padding: 32, color: '#7A8499', fontSize: 14 }}>Nenhum chamado encontrado.</td></tr>
            )}
            {chamadosPaginados.map(c => {
              const sol = usuarioPorId(c.solicitante);
              const tecs = c.tecnicos.map(id => usuarioPorId(id)).filter(Boolean);
              return (
                <tr key={c.id} style={{ borderTop: '1px solid #F2F4F8', cursor: 'pointer' }}
                  onClick={() => navTo('chamado-detalhe', c.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFD')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#0A328D', fontWeight: 700 }}>#{c.id}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{c.titulo}</div>
                    <div style={{ fontSize: 11, color: '#7A8499' }}>{c.unidade}</div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499' }}>{c.categoria}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '10px 14px' }}><PrioridadeBadge prioridade={c.prioridade} /></td>
                  {isTecnico && (
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      {sol ? (
                        <UsuarioInfoPopover usuario={sol} unidade={c.unidade} />
                      ) : '—'}
                    </td>
                  )}
                  <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                    {tecs.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        {tecs.map(tec => tec && (
                          <UsuarioInfoPopover key={tec.id} usuario={tec} />
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 12, color: '#7A8499' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499', whiteSpace: 'nowrap' }}>{fmtData(c.abertura)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499', whiteSpace: 'nowrap' }}>
                    {c.dataResolucao ? fmtData(c.dataResolucao) : '—'}
                  </td>
                  {isTecnico && (
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499', whiteSpace: 'nowrap' }}>
                      {c.status === 'prodam' ? horasDesde(inicioAguardandoProdam(c)) : '—'}
                    </td>
                  )}
                  {!isTecnico && (
                    <td style={{ padding: '10px 14px', fontSize: 14, color: c.avaliacao ? '#D4A82A' : '#7A8499', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                      {renderEstrelas(c.avaliacao)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#7A8499' }}>
              Mostrando {(paginaAtual - 1) * itensPorPagina + 1}
              {' - '}
              {Math.min(paginaAtual * itensPorPagina, filtered.length)}
              {' de '}
              {filtered.length} chamados
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                style={{ ...BTN_GHOST, padding: '6px 12px', fontSize: 12, opacity: paginaAtual === 1 ? 0.5 : 1 }}
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              >
                Anterior
              </button>
              <span style={{ fontSize: 12, color: '#4A5468', minWidth: 88, textAlign: 'center' }}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                style={{ ...BTN_GHOST, padding: '6px 12px', fontSize: 12, opacity: paginaAtual === totalPaginas ? 0.5 : 1 }}
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VIEW: Chamado Detalhe ────────────────────────────────────────────────────

function ViewChamadoDetalhe({ navTo, chamados, setChamados, activeId, usuarioPorId, usuarioLogadoId, usuarios, itensPatrimonio, capacidades, areaFiltro }: ViewProps) {
  const chamado = chamados.find(c => c.id === activeId);
  const usuarioLogado = usuarioLogadoId ? usuarioPorId(usuarioLogadoId) : null;
  const isTecnico = usuarioLogado?.perfil === 'TEC' || usuarioLogado?.perfil === 'ADM';
  const [mensagem, setMensagem] = useState('');
  const [anexosPendentes, setAnexosPendentes] = useState<Anexo[]>([]);
  const [arquivosPendentes, setArquivosPendentes] = useState<File[]>([]);
  const [tipoMensagem, setTipoMensagem] = useState<'publica' | 'interna'>('publica');
  const [modoAcao, setModoAcao] = useState<'responder' | 'solucao' | 'prodam' | 'encaminhar' | null>(null);
  const [areaEncaminhar, setAreaEncaminhar] = useState<TipoChamado | ''>('');
  const [textoAcao, setTextoAcao] = useState('');
  const [menuAcaoAberto, setMenuAcaoAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [notaSelecionada, setNotaSelecionada] = useState<number>(chamado?.avaliacao ?? 0);
  const [abaDetalhe, setAbaDetalhe] = useState<'chamado' | 'historico'>('chamado');
  const [modoNegarAcesso, setModoNegarAcesso] = useState(false);
  const [motivoNegacaoAcesso, setMotivoNegacaoAcesso] = useState('');
  const menuAcaoRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuAcaoAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (menuAcaoRef.current && !menuAcaoRef.current.contains(e.target as Node)) {
        setMenuAcaoAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [menuAcaoAberto]);

  const totalMensagens = chamado?.mensagens.length ?? 0;

  useEffect(() => {
    if (abaDetalhe !== 'chamado') return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [totalMensagens, abaDetalhe]);

  useEffect(() => {
    setNotaSelecionada(chamado?.avaliacao ?? 0);
  }, [chamado?.id, chamado?.avaliacao]);

  useEffect(() => {
    if (!isTecnico && abaDetalhe === 'historico') {
      setAbaDetalhe('chamado');
    }
  }, [isTecnico, abaDetalhe]);

  if (!chamado) {
    return (
      <div style={{ padding: 24 }}>
        <button style={BTN_GHOST} onClick={() => navTo('chamados')}>← Voltar</button>
        <p style={{ marginTop: 16, color: '#7A8499' }}>Chamado não encontrado.</p>
      </div>
    );
  }

  const item = chamado.item ? itemPorIdFrom(itensPatrimonio, chamado.item) : null;
  const isClosed = chamado.status === 'fechado';
  const isResponsavelChamado = usuarioLogadoId === chamado.solicitante || usuarioLogadoId === chamado.abertoEmNomeDe;
  const prazoConfirmacao = prazoConfirmacaoTexto(chamado);

  const descricaoTrim = chamado.descricao.trim();
  const temMensagemPublicaSolicitante = chamado.mensagens.some(
    m => m.autor === chamado.solicitante && m.tipo === 'publica'
  );
  const descricaoJaNaConversa =
    temMensagemPublicaSolicitante ||
    (descricaoTrim
      ? chamado.mensagens.some(m => m.texto.trim() === descricaoTrim)
      : true);
  const mensagensComDescricao: Mensagem[] =
    descricaoTrim && !descricaoJaNaConversa
      ? [
          {
            id: 0,
            autor: chamado.solicitante,
            data: chamado.abertura,
            texto: descricaoTrim,
            tipo: 'publica',
          },
          ...chamado.mensagens,
        ]
      : chamado.mensagens;

  const mensagensOrdenadas = [...mensagensComDescricao].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );
  const eventosOrdenados = [...chamado.eventos].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );

  const idxPrimeiraMsgSolicitante = mensagensOrdenadas.findIndex(
    m => m.autor === chamado.solicitante && m.tipo === 'publica',
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setAnexosPendentes(prev => [...prev, {
        id: Date.now() + Math.random(),
        nomeArquivo: file.name,
        urlArquivo: url,
        tipoMime: file.type,
        tamanho: file.size,
      }]);
      setArquivosPendentes(prev => [...prev, file]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removerAnexoPendente(id: number) {
    setAnexosPendentes(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx >= 0) setArquivosPendentes(f => f.filter((_, i) => i !== idx));
      return prev.filter(a => a.id !== id);
    });
  }

  async function enviarMensagem(texto?: string, tipo: 'publica' | 'interna' = 'publica') {
    const corpo = (texto ?? mensagem).trim();
    if (!corpo && anexosPendentes.length === 0) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const tipoEnvio = texto !== undefined ? tipo : tipoMensagem;
      const r = await fetch(`/api/helpdesk/chamados/${chamado!.id}/mensagens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: corpo || '(anexo)', tipo: tipoEnvio }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
        const ultimaMsg = data.chamado.mensagens[data.chamado.mensagens.length - 1];
        if (arquivosPendentes.length > 0 && ultimaMsg?.id) {
          await uploadAnexosChamado(chamado!.id, arquivosPendentes, ultimaMsg.id);
          const reload = await fetch('/api/helpdesk/chamados');
          const reloadData = await reload.json();
          if (reload.ok) {
            const atualizado = reloadData.chamados?.find((c: Chamado) => c.id === chamado!.id);
            if (atualizado) setChamados(prev => prev.map(c => (c.id === chamado!.id ? atualizado : c)));
          }
        }
      }
      setMensagem('');
      setAnexosPendentes([]);
      setArquivosPendentes([]);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function enviarRespostaTecnico() {
    if (!textoAcao.trim()) return;
    await enviarMensagem(textoAcao, 'publica');
    setTextoAcao('');
    setModoAcao(null);
  }

  async function confirmarSolucao() {
    if (!textoAcao.trim()) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/helpdesk/chamados/${chamado!.id}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoAcao.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
      }
      setTextoAcao('');
      setModoAcao(null);
      setMenuAcaoAberto(false);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function encaminharParaArea() {
    if (!textoAcao.trim() || !areaEncaminhar) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/helpdesk/chamados/${chamado!.id}/encaminhar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaPara: areaEncaminhar, motivo: textoAcao.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
      }
      setTextoAcao('');
      setAreaEncaminhar('');
      setModoAcao(null);
      setMenuAcaoAberto(false);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function enviarParaProdam() {
    if (!textoAcao.trim()) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/helpdesk/chamados/${chamado!.id}/prodam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoAcao.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
      }
      setTextoAcao('');
      setModoAcao(null);
      setMenuAcaoAberto(false);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarResultado(solucionado: boolean) {
    setEnviando(true);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/helpdesk/chamados/${chamado!.id}/confirmacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solucionado }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
      }
      setMenuAcaoAberto(false);
      setModoAcao(null);
      setTextoAcao('');
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  const solicitacaoAcesso = chamado.solicitacaoAcesso;
  const podeNegarAcesso =
    solicitacaoAcesso?.statusAutorizacao === 'aguardando' &&
    !!usuarioLogadoId &&
    solicitacaoAcesso.responsavelAutorizacao === usuarioLogadoId;

  async function negarSolicitacaoAcesso() {
    if (!motivoNegacaoAcesso.trim()) {
      setErroAcao('Informe o motivo da negativa');
      return;
    }
    setEnviando(true);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/helpdesk/acesso-sistemas/chamados/${chamado!.id}/negar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoNegacaoAcesso }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
      }
      setModoNegarAcesso(false);
      setMotivoNegacaoAcesso('');
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  async function enviarAvaliacao(avaliacao: number) {
    if (avaliacao < 1 || avaliacao > 5) return;
    setEnviando(true);
    setErroAcao(null);
    try {
      const r = await fetch(`/api/helpdesk/chamados/${chamado!.id}/avaliacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      if (data.chamado) {
        setChamados(prev => prev.map(c => (c.id === chamado!.id ? data.chamado : c)));
      }
      setNotaSelecionada(avaliacao);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button style={BTN_GHOST} onClick={() => navTo('chamados')}>← Voltar</button>
        <span style={{ fontSize: 13, color: '#7A8499' }}>{areaFiltro ? labelTipoChamado(areaFiltro) : 'Chamados'}</span>
        <span style={{ fontSize: 13, color: '#7A8499' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>#{chamado.id}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left column: description + chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title & status */}
          <div style={CARD_STYLE}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>{chamado.titulo}</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={chamado.status} />
                  <PrioridadeBadge prioridade={chamado.prioridade} />
                  <AreaBadge area={chamado.areaAtual} />
                  {chamado.areaOrigem !== chamado.areaAtual && (
                    <span style={{ fontSize: 11, color: '#7A8499' }}>
                      (aberto em {labelTipoChamado(chamado.areaOrigem)})
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#7A8499' }}>#{chamado.id}</span>
                  <span style={{ fontSize: 12, color: '#7A8499' }}>·</span>
                  <span style={{ fontSize: 12, color: '#7A8499' }}>{fmtData(chamado.abertura)}</span>
                </div>
              </div>
            </div>
            {chamado.status === 'prodam' && (
              <div style={{ fontSize: 12, color: '#4F2A70', background: '#EEE2F7', border: '1px solid #DCC7EE', borderRadius: 10, padding: '8px 12px' }}>
                Em Aguardando PRODAM há <strong>{horasDesde(inicioAguardandoProdam(chamado))}</strong>.
              </div>
            )}
            {!isTecnico && chamado.status === 'resolvido' && isResponsavelChamado && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#0A328D', background: '#EAF0FE', border: '1px solid #D2DDF9', borderRadius: 10, padding: '8px 12px' }}>
                Aguardando sua confirmação da solução. {prazoConfirmacao ?? ''}
              </div>
            )}
            {solicitacaoAcesso?.statusAutorizacao === 'aguardando' && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#7A5700', background: '#FEF3CD', border: '1px solid #F5D76E', borderRadius: 10, padding: '8px 12px' }}>
                Aguardando autorização de{' '}
                <strong>{solicitacaoAcesso.responsavelAutorizacaoNome ?? 'coordenador/diretor'}</strong>.
                {podeNegarAcesso
                  ? ' Você pode negar abaixo se não autorizar; sem negativa em 7 dias, a solicitação será autorizada automaticamente.'
                  : ' Sem negativa do responsável em 7 dias, a solicitação será autorizada automaticamente.'}
              </div>
            )}
          </div>

          {/* Abas: conversa (todos) e histórico de movimentação (apenas técnicos) */}
          <div style={CARD_STYLE}>
            {isTecnico && (
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1', marginBottom: 16 }}>
              {([
                { key: 'chamado' as const, label: 'Chamado', count: mensagensOrdenadas.length },
                { key: 'historico' as const, label: 'Histórico', count: eventosOrdenados.length },
              ]).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAbaDetalhe(tab.key)}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
                    fontWeight: abaDetalhe === tab.key ? 700 : 500,
                    color: abaDetalhe === tab.key ? '#0A328D' : '#7A8499',
                    borderBottom: abaDetalhe === tab.key ? '2px solid #0A328D' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                  <span style={{
                    marginLeft: 5, fontSize: 11,
                    background: abaDetalhe === tab.key ? '#D9E1F4' : '#F2F4F8',
                    color: abaDetalhe === tab.key ? '#0A328D' : '#7A8499',
                    borderRadius: 10, padding: '1px 7px', fontWeight: 600,
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            )}

            {isTecnico && abaDetalhe === 'historico' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
                {eventosOrdenados.length === 0 ? (
                  <div style={{ textAlign: 'center', fontSize: 13, color: '#7A8499', padding: '32px 0' }}>
                    Nenhum registro no histórico.
                  </div>
                ) : (
                  eventosOrdenados.map((evento, i) => {
                    const autorEvento = usuarioPorId(evento.autor);
                    const rotulo = formatEventoHistorico(evento, autorEvento?.nome);
                    return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '4px 0' }}>
                      <div style={{ height: 1, flex: 1, background: '#E8EBF1' }} />
                      <span style={{ fontSize: 11, color: '#7A8499', background: '#F4F5F9', padding: '6px 12px', borderRadius: 20, textAlign: 'center', lineHeight: 1.4, maxWidth: 'min(520px, 95%)' }}>
                        {rotulo} · {fmtDataCurta(evento.data)}
                      </span>
                      <div style={{ height: 1, flex: 1, background: '#E8EBF1' }} />
                    </div>
                    );
                  })
                )}
              </div>
            ) : (
            <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, minHeight: 200 }}>
              {mensagensOrdenadas.map((item, i) => {
                const autor = usuarioPorId(item.autor);
                const isTec = autor?.perfil === 'TEC' || autor?.perfil === 'ADM';
                const isProdam = isMensagemMotivoProdam(item.texto);
                const isInterna = item.tipo === 'interna' && !isProdam;
                const isSolucao = isMensagemSolucao(item.texto, item.tipo, chamado.resolucao);
                const mensagemDeTecnico = isTec && !isSolucao;
                const bolhaAzulTecnico = mensagemDeTecnico && !isInterna && !isProdam;
                const prodamMeta = STATUS_META.prodam;
                // Técnico: solicitante à esquerda, equipe à direita. Usuário: ordem invertida.
                const alinhamentoDireita = isTecnico ? mensagemDeTecnico : !mensagemDeTecnico;
                const isMensagemInicialSolicitante = i === idxPrimeiraMsgSolicitante;

                return (
                  <div key={`msg-${item.id}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexDirection: alinhamentoDireita ? 'row-reverse' : 'row' }}>
                    <Avatar nome={autor?.nome || '?'} size={30} bg={isSolucao ? '#90c2d8' : isProdam ? prodamMeta.cor : isTec ? '#0A328D' : '#7A8499'} />
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 11, color: '#7A8499', marginBottom: 3, textAlign: alinhamentoDireita ? 'right' : 'left', display: 'flex', gap: 6, alignItems: 'center', flexDirection: alinhamentoDireita ? 'row-reverse' : 'row' }}>
                        <span>{autor?.nome || '?'} · {fmtData(item.data)}</span>
                        {isSolucao && (
                          <span style={{ fontSize: 10, background: GLPI_SOLUCAO.bg, color: GLPI_SOLUCAO.fg, border: `1px solid ${GLPI_SOLUCAO.border}`, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>solução</span>
                        )}
                        {isProdam && (
                          <span style={{ fontSize: 10, background: prodamMeta.corBg, color: prodamMeta.corText, border: `1px solid ${prodamMeta.cor}`, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>PRODAM</span>
                        )}
                        {isInterna && (
                          <span style={{ fontSize: 10, background: '#FEF3CD', color: '#7A5700', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>nota interna</span>
                        )}
                      </div>
                      <div style={{
                        background: isSolucao ? GLPI_SOLUCAO.bg : isProdam ? prodamMeta.corBg : isInterna ? '#FFFBEC' : bolhaAzulTecnico ? '#0A328D' : isMensagemInicialSolicitante ? '#e2f2e3' : '#fff',
                        color: isSolucao ? GLPI_SOLUCAO.fg : isProdam ? prodamMeta.corText : isInterna ? '#5C4000' : bolhaAzulTecnico ? '#fff' : '#1B2336',
                        border: isSolucao ? `1px solid ${GLPI_SOLUCAO.border}` : isProdam ? `1px solid #DCC7EE` : isInterna ? '1px dashed #F5D76E' : bolhaAzulTecnico ? 'none' : isMensagemInicialSolicitante ? '1px solid #e2f2e3' : '1px solid #E8EBF1',
                        borderRadius: isSolucao || isProdam ? 14 : alinhamentoDireita ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '10px 14px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                      }}>
                        {item.texto}
                        {item.anexos && item.anexos.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {item.anexos.map(a => (
                              <div key={a.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                                {a.tipoMime.startsWith('image/') ? (
                                  <img src={a.urlArquivo} alt={a.nomeArquivo} style={{ maxWidth: 180, maxHeight: 120, display: 'block', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => window.open(a.urlArquivo, '_blank')} />
                                ) : (
                                  <a href={a.urlArquivo} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, color: isSolucao ? GLPI_SOLUCAO.fg : isProdam ? prodamMeta.corText : bolhaAzulTecnico ? '#fff' : '#0A328D', textDecoration: 'none' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    {a.nomeArquivo}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {isClosed ? (
              <div style={{ textAlign: 'center', fontSize: 13, color: '#7A8499', padding: '12px 0', borderTop: '1px solid #E8EBF1' }}>
                <span style={{ background: '#F2F4F8', padding: '6px 16px', borderRadius: 20 }}>Conversa encerrada</span>
                {!isTecnico && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#4A5468' }}>Avalie este chamado (1 a 5 estrelas)</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((nota) => (
                        <button
                          key={nota}
                          type="button"
                          disabled={enviando}
                          onClick={() => enviarAvaliacao(nota)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: enviando ? 'default' : 'pointer',
                            color: nota <= (chamado.avaliacao ?? notaSelecionada) ? '#D4A82A' : '#C9D0DE',
                            fontSize: 22,
                            lineHeight: 1,
                            padding: 0,
                          }}
                          title={`${nota} estrela(s)`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : isTecnico ? (
              <div style={{ borderTop: '1px solid #E8EBF1', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {modoAcao === 'responder' && (
                  <>
                    <textarea
                      value={textoAcao}
                      onChange={e => setTextoAcao(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) enviarRespostaTecnico(); }}
                      placeholder="Digite sua resposta... (Ctrl+Enter para enviar)"
                      rows={4}
                      autoFocus
                      style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" style={BTN_GHOST} onClick={() => { setModoAcao(null); setTextoAcao(''); }}>
                        Cancelar
                      </button>
                      <button type="button" style={BTN_PRIMARY} onClick={enviarRespostaTecnico} disabled={!textoAcao.trim() || enviando}>
                        {enviando ? 'Enviando...' : 'Enviar resposta'}
                      </button>
                    </div>
                  </>
                )}

                {modoAcao === 'solucao' && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2336' }}>Adicionar uma solução</div>
                    <p style={{ fontSize: 12, color: '#7A8499', margin: 0, lineHeight: 1.5 }}>
                      Descreva o que foi feito. Ao confirmar, o chamado será marcado como <strong>Resolvido</strong>.
                    </p>
                    <textarea
                      value={textoAcao}
                      onChange={e => setTextoAcao(e.target.value)}
                      placeholder="Descreva a solução aplicada..."
                      rows={5}
                      autoFocus
                      style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit', background: '#F4F9FD' }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" style={BTN_GHOST} onClick={() => { setModoAcao(null); setTextoAcao(''); }}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={confirmarSolucao}
                        disabled={!textoAcao.trim()}
                        style={{
                          ...BTN_PRIMARY,
                          background: '#0A328D',
                          opacity: textoAcao.trim() ? 1 : 0.5,
                        }}
                      >
                        {enviando ? 'Salvando...' : 'Confirmar solução'}
                      </button>
                    </div>
                  </>
                )}

                {modoAcao === 'encaminhar' && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2336' }}>Encaminhar para outra área</div>
                    <p style={{ fontSize: 12, color: '#7A8499', margin: 0, lineHeight: 1.5 }}>
                      Use quando o chamado foi aberto na área errada ou precisar de atuação de outra equipe.
                      Área atual: <strong>{labelTipoChamado(chamado.areaAtual)}</strong>.
                    </p>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4A5468' }}>
                      Área de destino
                      <select
                        value={areaEncaminhar}
                        onChange={e => setAreaEncaminhar(e.target.value as TipoChamado | '')}
                        style={{ ...INPUT_STYLE, width: '100%', marginTop: 6 }}
                      >
                        <option value="">Selecione a área...</option>
                        {TIPOS_CHAMADO.filter(t => t !== chamado.areaAtual).map(t => (
                          <option key={t} value={t}>{TIPO_CHAMADO_META[t].label}</option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      value={textoAcao}
                      onChange={e => setTextoAcao(e.target.value)}
                      placeholder="Descreva o motivo do encaminhamento..."
                      rows={4}
                      autoFocus
                      style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit', background: '#F4F5F9' }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" style={BTN_GHOST} onClick={() => { setModoAcao(null); setTextoAcao(''); setAreaEncaminhar(''); }}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={encaminharParaArea}
                        disabled={!textoAcao.trim() || !areaEncaminhar || enviando}
                        style={{
                          ...BTN_PRIMARY,
                          background: '#4A5468',
                          opacity: textoAcao.trim() && areaEncaminhar && !enviando ? 1 : 0.5,
                        }}
                      >
                        {enviando ? 'Encaminhando...' : 'Confirmar encaminhamento'}
                      </button>
                    </div>
                  </>
                )}

                {modoAcao === 'prodam' && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B2336' }}>Enviar para Aguardando PRODAM</div>
                    <p style={{ fontSize: 12, color: '#7A8499', margin: 0, lineHeight: 1.5 }}>
                      Use quando houver dependência de intervenção da PRODAM. Descreva o motivo do envio. O tempo de espera será contado automaticamente.
                    </p>
                    <textarea
                      value={textoAcao}
                      onChange={e => setTextoAcao(e.target.value)}
                      placeholder="Descreva o motivo do envio para a PRODAM..."
                      rows={5}
                      autoFocus
                      style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit', background: '#F7F2FC' }}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" style={BTN_GHOST} onClick={() => { setModoAcao(null); setTextoAcao(''); }}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={enviarParaProdam}
                        disabled={!textoAcao.trim() || enviando}
                        style={{
                          ...BTN_PRIMARY,
                          background: '#6B3E91',
                          opacity: textoAcao.trim() && !enviando ? 1 : 0.5,
                        }}
                      >
                        {enviando ? 'Enviando...' : 'Confirmar envio para PRODAM'}
                      </button>
                    </div>
                  </>
                )}

                <div ref={menuAcaoRef} style={{ position: 'relative', alignSelf: 'flex-start' }}>
                  <div style={{
                    display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
                    border: '1px solid #D4A82A', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAcaoAberto(false);
                        if (modoAcao === 'responder') {
                          setModoAcao(null);
                          setTextoAcao('');
                        } else {
                          setModoAcao('responder');
                          setTextoAcao('');
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: '#F5C842', color: '#1B2336', border: 'none', padding: '6px 12px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Responder
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuAcaoAberto(v => !v)}
                      style={{
                        background: '#F5C842', color: '#1B2336', border: 'none',
                        borderLeft: '1px solid #D4A82A', padding: '6px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      aria-label="Mais ações"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>

                  {menuAcaoAberto && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, minWidth: 220, zIndex: 20,
                      background: '#fff', border: '1px solid #E8EBF1', borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(20,30,55,0.12)', overflow: 'hidden',
                    }}>
                      {!isClosed && chamado.status !== 'resolvido' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuAcaoAberto(false);
                            setModoAcao('encaminhar');
                            setTextoAcao('');
                            setAreaEncaminhar('');
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                            background: '#EEF2F7', color: '#1B2336', fontSize: 13, fontWeight: 600,
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5468" strokeWidth="2.5">
                            <path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                            <path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
                          </svg>
                          Encaminhar para outra área
                        </button>
                      )}
                      {chamado.status !== 'prodam' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuAcaoAberto(false);
                            setModoAcao('prodam');
                            setTextoAcao('');
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                            background: '#EEE2F7', color: '#1B2336', fontSize: 13, fontWeight: 600,
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B3E91" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          Enviar para PRODAM
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuAcaoAberto(false);
                          setModoAcao('solucao');
                          setTextoAcao('');
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: '#D9E8F7', color: '#1B2336', fontSize: 13, fontWeight: 600,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A328D" strokeWidth="2.5">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        Adicionar uma solução
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid #E8EBF1', paddingTop: 14 }}>
                {erroAcao && (
                  <div style={{ background: '#FBDADA', border: '1px solid #F5AAAA', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#7A1F1F' }}>
                    {erroAcao}
                  </div>
                )}
                {chamado.status === 'resolvido' && isResponsavelChamado ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 13, color: '#4A5468' }}>
                      Você tem até 7 dias para confirmar se a solução foi aplicada.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => confirmarResultado(false)}
                        disabled={enviando}
                        style={{ ...BTN_GHOST, color: '#7A1F1F', borderColor: '#F5AAAA' }}
                      >
                        Não foi solucionado
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmarResultado(true)}
                        disabled={enviando}
                        style={BTN_PRIMARY}
                      >
                        Confirmar solução
                      </button>
                    </div>
                  </div>
                ) : chamado.status === 'resolvido' ? (
                  <div style={{ fontSize: 13, color: '#7A8499' }}>
                    Aguardando confirmação do solicitante para fechamento deste chamado.
                  </div>
                ) : (
                  <>
                {/* Tipo de mensagem — apenas técnicos */}
                {isTecnico && <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(['publica', 'interna'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTipoMensagem(t)} style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                      background: tipoMensagem === t ? (t === 'interna' ? '#FEF3CD' : '#D9E1F4') : '#fff',
                      color: tipoMensagem === t ? (t === 'interna' ? '#7A5700' : '#0A328D') : '#7A8499',
                      borderColor: tipoMensagem === t ? (t === 'interna' ? '#F5D76E' : '#0A328D') : '#E8EBF1',
                    }}>
                      {t === 'publica' ? 'Pública' : 'Nota interna'}
                    </button>
                  ))}
                </div>}

                {/* Pré-visualização de anexos pendentes */}
                {anexosPendentes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {anexosPendentes.map(a => (
                      <div key={a.id} style={{ position: 'relative', borderRadius: 8, border: '1px solid #E8EBF1', overflow: 'hidden' }}>
                        {a.tipoMime.startsWith('image/') ? (
                          <img src={a.urlArquivo} alt={a.nomeArquivo} style={{ width: 72, height: 56, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ padding: '6px 10px', fontSize: 11, color: '#4A5468', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.nomeArquivo}
                          </div>
                        )}
                        <button onClick={() => removerAnexoPendente(a.id)} style={{
                          position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                          background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                          color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) enviarMensagem(); }}
                    placeholder={tipoMensagem === 'interna' ? 'Nota interna (visível apenas para técnicos)...' : 'Escreva uma mensagem... (Ctrl+Enter para enviar)'}
                    rows={3}
                    style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit', background: tipoMensagem === 'interna' ? '#FFFBEC' : '#fff' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} />
                    <button type="button" style={{ ...BTN_GHOST, padding: '10px 12px' }} onClick={() => fileInputRef.current?.click()} title="Anexar arquivo">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <button style={{ ...BTN_PRIMARY, padding: '10px 12px', opacity: enviando ? 0.7 : 1 }} onClick={() => enviarMensagem()} disabled={enviando}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#7A8499', marginTop: 4 }}>Ctrl+Enter para enviar</div>
                  </>
                )}
              </div>
            )}
            </>
            )}
          </div>
        </div>

        {/* Right column: metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SecaoAtoresChamado
            chamado={chamado}
            usuarios={usuarios}
            usuarioPorId={usuarioPorId}
            usuarioLogadoId={usuarioLogadoId}
            isTecnico={isTecnico}
            isClosed={isClosed}
            onAtualizado={c => setChamados(prev => prev.map(x => (x.id === c.id ? c : x)))}
          />

          {/* Metadata card */}
          <div style={CARD_STYLE}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Informações</div>
            {[
            ...(solicitacaoAcesso ? [
              { label: 'Beneficiário', value: `${solicitacaoAcesso.nomeBeneficiario} (RF ${solicitacaoAcesso.rfBeneficiario})` },
              { label: 'Sistema', value: solicitacaoAcesso.sistema },
              { label: 'Permissão', value: solicitacaoAcesso.permissao },
              { label: 'Coord./Divisão', value: solicitacaoAcesso.coordenadoria ?? solicitacaoAcesso.unidade },
              ...(solicitacaoAcesso.observacao ? [{ label: 'Observação', value: solicitacaoAcesso.observacao }] : []),
              { label: 'Responsável', value: solicitacaoAcesso.responsavelAutorizacaoNome ?? '—' },
              { label: 'Autorização', value: solicitacaoAcesso.statusAutorizacao === 'aguardando' ? 'Aguardando' : solicitacaoAcesso.statusAutorizacao === 'negado' ? 'Negada' : 'Autorizada' },
              ...(solicitacaoAcesso.motivoNegacao ? [{ label: 'Motivo negativa', value: solicitacaoAcesso.motivoNegacao }] : []),
            ] : []),
            { label: 'Área atual', value: labelTipoChamado(chamado.areaAtual) },
            { label: 'Área de abertura', value: labelTipoChamado(chamado.areaOrigem) },
            { label: 'Categoria', value: chamado.categoria },
            { label: 'Unidade', value: chamado.unidade },
            { label: 'Abertura', value: fmtData(chamado.abertura) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F2F4F8', fontSize: 13 }}>
                <span style={{ color: '#7A8499', fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 180 }}>{row.value}</span>
              </div>
            ))}

            {chamado.resolucao && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ fontSize: 13, color: '#7A8499', fontWeight: 500, marginBottom: 4 }}>Resolução</div>
                <div style={{ fontSize: 13, color: '#1B2336', lineHeight: 1.5 }}>{chamado.resolucao}</div>
              </div>
            )}

            {podeNegarAcesso && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2F4F8' }}>
                {!modoNegarAcesso ? (
                  <button
                    type="button"
                    style={{ ...BTN_GHOST, width: '100%', justifyContent: 'center', color: '#B42318', borderColor: '#FECDCA' }}
                    onClick={() => setModoNegarAcesso(true)}
                  >
                    Negar solicitação
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={motivoNegacaoAcesso}
                      onChange={e => setMotivoNegacaoAcesso(e.target.value)}
                      placeholder="Motivo da negativa (obrigatório)"
                      rows={3}
                      style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        style={{ ...BTN_GHOST, flex: 1, justifyContent: 'center' }}
                        onClick={() => { setModoNegarAcesso(false); setMotivoNegacaoAcesso(''); }}
                        disabled={enviando}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        style={{ ...BTN_PRIMARY, flex: 1, justifyContent: 'center', background: '#B42318', opacity: enviando ? 0.7 : 1 }}
                        onClick={() => negarSolicitacaoAcesso()}
                        disabled={enviando}
                      >
                        Confirmar negativa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(chamado.encaminhamentos?.length ?? 0) > 0 && (
            <div style={CARD_STYLE}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Encaminhamentos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...(chamado.encaminhamentos ?? [])].reverse().map(enc => {
                  const autorEnc = usuarioPorId(enc.autor);
                  return (
                    <div key={enc.id} style={{ background: '#FAFBFD', borderRadius: 8, padding: 12, fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: '#1B2336', marginBottom: 4 }}>
                        {labelTipoChamado(enc.areaDe)} → {labelTipoChamado(enc.areaPara)}
                      </div>
                      <div style={{ color: '#4A5468', lineHeight: 1.5, marginBottom: 6 }}>{enc.motivo}</div>
                      <div style={{ color: '#7A8499' }}>
                        {autorEnc?.nome ?? '—'} · {fmtDataCurta(enc.data)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linked item */}
          {item && (
            <div style={CARD_STYLE}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Item Vinculado</div>
              <div style={{ background: '#FAFBFD', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{item.descsbpm}</div>
                <div style={{ fontSize: 12, color: '#7A8499' }}>Patrimônio: {item.patrimonio}</div>
                <div style={{ fontSize: 12, color: '#7A8499' }}>Série: {item.numserie}</div>
                <div style={{ fontSize: 12, color: '#7A8499' }}>Local: {item.localizacao}</div>
              </div>
              {capacidades.patrimonio && (
              <button style={{ ...BTN_GHOST, width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 12 }}
                onClick={() => navTo('item-detalhe', item.idbem)}>
                Ver patrimônio
              </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VIEW: Novo Chamado ───────────────────────────────────────────────────────

function ViewNovoChamado({
  navTo, setChamados, usuarios, usuarioPorId, usuarioLogadoId,
  unidades, categorias, categoriasPai, itensPatrimonio, areaFiltro,
}: ViewProps) {
  const tipoArea = areaFiltro ?? 'suporte_tecnico';
  const areaMeta = TIPO_CHAMADO_META[tipoArea];
  const precisaComputador = exigeComputadorNaAbertura(tipoArea);
  const usuarioLogado = usuarioLogadoId ? usuarioPorId(usuarioLogadoId) : null;
  const isTecnico = usuarioLogado?.perfil === 'TEC' || usuarioLogado?.perfil === 'ADM';

  // Solicitante
  const [paraOutraPessoa, setParaOutraPessoa] = useState(false);
  const [solicitanteSelecionado, setSolicitanteSelecionado] = useState<Usuario | null>(null);

  // Técnico abrindo em nome de (apenas se perfil TEC/ADM)
  const [emNomeDe, setEmNomeDe] = useState<Usuario | null>(null);

  // Telefone — pré-preenchido do AD (mock: campo telefone do usuário)
  const solicitanteEfetivo = paraOutraPessoa ? solicitanteSelecionado : usuarioLogado;
  const [telefone, setTelefone] = useState(usuarioLogado?.telefone || '');

  // Preenche o telefone ao trocar solicitante
  useEffect(() => {
    setTelefone(solicitanteEfetivo?.telefone || '');
  }, [solicitanteEfetivo?.id]);

  useEffect(() => {
    if (usuarioLogado?.telefone && !paraOutraPessoa) {
      setTelefone(usuarioLogado.telefone);
    }
  }, [usuarioLogado?.id, paraOutraPessoa]);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<Unidade | null>(null);
  const [categoriaPai, setCategoriaPai] = useState('');
  const [categoriaFilho, setCategoriaFilho] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('media');
  const [itemSelecionado, setItemSelecionado] = useState<ItemPatrimonio | null>(null);
  const [anexosAbertura, setAnexosAbertura] = useState<Anexo[]>([]);
  const [arquivosAbertura, setArquivosAbertura] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriasPaiFiltradas = useMemo(() => {
    const filtradas = categoriasPai.filter(p => categoriaCompativelComArea(categorias, p, tipoArea));
    return filtradas.length > 0 ? filtradas : categoriasPai;
  }, [categoriasPai, tipoArea]);

  const filhos = useMemo(() => {
    return categorias
      .filter(c => c.pai === categoriaPai && c.filho !== null)
      .map(c => c.filho as string);
  }, [categoriaPai, categorias]);

  const categoriaId = useMemo(
    () => resolveCategoriaId(categorias, categoriaPai, categoriaFilho),
    [categorias, categoriaPai, categoriaFilho]
  );

  const precisaSubcategoria = useMemo(
    () => !!categoriaPai && categorias.some(c => c.pai === categoriaPai && c.filho !== null),
    [categoriaPai, categorias]
  );

  const computadores = useMemo(
    () =>
      itensPatrimonio.filter(
        (i) => isTipoComputador(i.tipo) && normalizarStatusItem(i.statusitem) === 'Ativo',
      ),
    [itensPatrimonio],
  );

  useEffect(() => {
    if (!precisaComputador) return;
    const solId = solicitanteEfetivo?.id;
    if (!solId) {
      setItemSelecionado(null);
      return;
    }
    const associado = computadores.find(c => c.servidorId === solId);
    setItemSelecionado(associado ?? null);
  }, [solicitanteEfetivo?.id, computadores, precisaComputador]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setAnexosAbertura(prev => [...prev, {
        id: Date.now() + Math.random(),
        nomeArquivo: file.name,
        urlArquivo: url,
        tipoMime: file.type,
        tamanho: file.size,
      }]);
      setArquivosAbertura(prev => [...prev, file]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!titulo.trim()) errs.push('Título é obrigatório');
    if (!descricao.trim()) errs.push('Descrição é obrigatória');
    if (!unidadeSelecionada) errs.push('Unidade é obrigatória');
    if (!categoriaPai) errs.push('Categoria é obrigatória');
    if (precisaSubcategoria && !categoriaFilho) errs.push('Selecione a subcategoria');
    if (!categoriaId) errs.push('Categoria inválida');
    if (paraOutraPessoa && !solicitanteSelecionado) errs.push('Selecione o solicitante');
    if (precisaComputador && !itemSelecionado) {
      setErrors([...errs, 'Computador é obrigatório']);
      return;
    }
    if (errs.length > 0) { setErrors(errs); return; }
    const computadorSelecionado = itemSelecionado;

    if (!usuarioLogadoId) {
      errs.push('Não foi possível identificar o usuário logado');
      setErrors(errs);
      return;
    }
    const solId = solicitanteEfetivo?.id;
    if (!solId) {
      errs.push('Selecione o solicitante');
      setErrors(errs);
      return;
    }

    const observadorIds = paraOutraPessoa && usuarioLogadoId ? [usuarioLogadoId] : [];

    setSalvando(true);
    setErrors([]);
    try {
      const r = await fetch('/api/helpdesk/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          unidadeId: unidadeSelecionada!.id,
          categoriaId,
          prioridade,
          solicitanteId: solId,
          abertoEmNomeDeId: emNomeDe?.id ?? null,
          telefone: telefone.trim() || undefined,
          itemId: computadorSelecionado?.idbem ?? null,
          areaAtual: tipoArea,
          observadorIds,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);

      if (arquivosAbertura.length > 0) {
        await uploadAnexosChamado(
          data.chamado.id,
          arquivosAbertura,
          data.mensagemInicialId
        );
        const reload = await fetch('/api/helpdesk/chamados');
        const reloadData = await reload.json();
        if (reload.ok && data.chamado) {
          const atualizado = reloadData.chamados?.find((c: Chamado) => c.id === data.chamado.id);
          setChamados(prev => [atualizado ?? data.chamado, ...prev.filter(c => c.id !== data.chamado.id)]);
        } else {
          setChamados(prev => [data.chamado, ...prev]);
        }
      } else {
        setChamados(prev => [data.chamado, ...prev]);
      }

      navTo('chamado-detalhe', data.chamado.id);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setSalvando(false);
    }
  }

  const LABEL: React.CSSProperties = { fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 };
  const LABEL_OPT: React.CSSProperties = { ...LABEL, fontWeight: 400, color: '#7A8499' };

  if (!usuarioLogado) {
    return (
      <div style={{ padding: 24, maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button style={BTN_GHOST} onClick={() => navTo('chamados')}>← Voltar</button>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Novo Chamado — {areaMeta.label}</h1>
        </div>
        <p style={{ fontSize: 13, color: '#7A8499' }}>
          {usuarioLogadoId === null ? 'Carregando seus dados...' : 'Usuário logado não encontrado na base do helpdesk.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button style={BTN_GHOST} onClick={() => navTo('chamados')}>← Voltar</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Novo Chamado</h1>
          <p style={{ fontSize: 13, color: '#7A8499', margin: '4px 0 0' }}>{areaMeta.descricao}</p>
        </div>
        <AreaBadge area={tipoArea} />
      </div>

      {errors.length > 0 && (
        <div style={{ background: '#FBDADA', border: '1px solid #F5AAAA', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          {errors.map((e, i) => <div key={i} style={{ fontSize: 13, color: '#7A1F1F' }}>• {e}</div>)}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Bloco: Para quem é o chamado ── */}
          <div style={CARD_STYLE}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Solicitante</div>

            {/* Para mim / Para outra pessoa (técnicos e admins) */}
            {isTecnico && <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[
                { v: false, label: 'Para mim' },
                { v: true, label: 'Para outra pessoa' },
              ].map(opt => (
                <button key={String(opt.v)} type="button" onClick={() => { setParaOutraPessoa(opt.v); setSolicitanteSelecionado(null); }}
                  style={{
                    padding: '7px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: `2px solid ${paraOutraPessoa === opt.v ? '#0A328D' : '#E8EBF1'}`,
                    background: paraOutraPessoa === opt.v ? '#D9E1F4' : '#fff',
                    color: paraOutraPessoa === opt.v ? '#0A328D' : '#4A5468',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>}

            {paraOutraPessoa ? (
              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>Solicitante *</label>
                <AutocompleteInput
                  value={solicitanteSelecionado}
                  onChange={setSolicitanteSelecionado}
                  items={usuarios.filter(u => u.id !== usuarioLogadoId && u.statususer === 'Ativo')}
                  getLabel={u => u.nome}
                  getKey={u => u.id}
                  placeholder="Digite o nome do usuário..."
                  renderItem={u => (
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nome}</div>
                  )}
                />
                <div style={{ fontSize: 11, color: '#7A8499', marginTop: 4 }}>
                  Você ficará como observador neste chamado.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFBFD', borderRadius: 8, marginBottom: 14 }}>
                <Avatar nome={usuarioLogado.nome} size={32} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>{usuarioLogado.nome}</div>
              </div>
            )}

            {/* Técnico abre em nome de */}
            {isTecnico && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ ...LABEL, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Abrir em nome de
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#7A8499' }}>(opcional — quando o técnico registra pelo usuário)</span>
                </label>
                <AutocompleteInput
                  value={emNomeDe}
                  onChange={setEmNomeDe}
                  items={usuarios.filter(u => u.statususer === 'Ativo')}
                  getLabel={u => u.nome}
                  getKey={u => u.id}
                  placeholder="Deixe em branco ou busque o usuário..."
                />
                {emNomeDe && (
                  <button type="button" onClick={() => setEmNomeDe(null)} style={{ ...BTN_GHOST, marginTop: 4, padding: '3px 10px', fontSize: 11 }}>
                    Remover
                  </button>
                )}
              </div>
            )}

            {/* Telefone pré-preenchido via AD */}
            <div>
              <label style={LABEL}>
                Telefone de contato
                {solicitanteEfetivo?.telefone && (
                  <span style={{ fontWeight: 400, color: '#5CC9BD', marginLeft: 6, fontSize: 11 }}>preenchido via AD</span>
                )}
              </label>
              <input
                style={INPUT_STYLE}
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(11) 9 0000-0000"
              />
            </div>
          </div>

          {/* ── Bloco: Detalhes do chamado ── */}
          <div style={CARD_STYLE}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Detalhes do Chamado</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Título */}
              <div>
                <label style={LABEL}>Título *</label>
                <input style={INPUT_STYLE} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Descreva brevemente o problema..." />
              </div>

              {/* Unidade — autocomplete */}
              <div>
                <label style={LABEL}>Unidade *</label>
                <AutocompleteInput
                  value={unidadeSelecionada}
                  onChange={setUnidadeSelecionada}
                  items={unidades}
                  getLabel={u => u.full}
                  getKey={u => u.id}
                  placeholder="Digite para filtrar unidades..."
                />
              </div>

              {/* Categoria */}
              <div>
                <label style={LABEL}>Categoria *</label>
                <select style={INPUT_STYLE} value={categoriaPai} onChange={e => { setCategoriaPai(e.target.value); setCategoriaFilho(''); }}>
                  <option value="">Selecione a categoria...</option>
                  {categoriasPaiFiltradas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {filhos.length > 0 && (
                <div>
                  <label style={LABEL}>Subcategoria *</label>
                  <select style={INPUT_STYLE} value={categoriaFilho} onChange={e => setCategoriaFilho(e.target.value)}>
                    <option value="">Selecione a subcategoria...</option>
                    {filhos.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}

              {/* Prioridade */}
              <div>
                <label style={LABEL}>Prioridade</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['baixa', 'media', 'alta', 'urgente'] as Prioridade[]).map(p => {
                    const m = PRIORIDADE_META[p];
                    return (
                      <button type="button" key={p} onClick={() => setPrioridade(p)} style={{
                        border: `2px solid ${prioridade === p ? m.corText : '#E8EBF1'}`,
                        background: prioridade === p ? m.corBg : '#fff',
                        color: prioridade === p ? m.corText : '#4A5468',
                        borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Computador — obrigatório apenas em Suporte Técnico */}
              <div>
                <label style={LABEL}>Computador{precisaComputador ? ' *' : ' (opcional)'}</label>
                {itemSelecionado && solicitanteEfetivo && itemSelecionado.servidorId === solicitanteEfetivo.id && (
                  <div style={{ fontSize: 11, color: '#5CC9BD', marginBottom: 6 }}>
                    Preenchido automaticamente com o computador vinculado ao solicitante.
                  </div>
                )}
                <AutocompleteInput
                  value={itemSelecionado}
                  onChange={setItemSelecionado}
                  items={computadores}
                  getLabel={it => `${it.patrimonio} — ${it.descsbpm}`}
                  getKey={it => it.idbem}
                  placeholder="Busque por patrimônio, descrição ou modelo do computador..."
                  renderItem={it => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{it.patrimonio}</span>
                        <StatusItemBadge status={it.statusitem} />
                      </div>
                      <div style={{ fontSize: 12, color: '#4A5468' }}>{it.descsbpm}</div>
                      <div style={{ fontSize: 11, color: '#7A8499' }}>
                        {it.nomeRede ? `${it.nomeRede} · ` : ''}{it.localizacao}
                      </div>
                    </div>
                  )}
                />
                {itemSelecionado && (
                  <div style={{ marginTop: 8, background: '#FAFBFD', borderRadius: 8, padding: '8px 12px', border: '1px solid #E8EBF1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{itemSelecionado.descsbpm}</div>
                      <div style={{ fontSize: 11, color: '#7A8499' }}>Série: {itemSelecionado.numserie} · Local: {itemSelecionado.localizacao}</div>
                    </div>
                    <button type="button" onClick={() => setItemSelecionado(null)} style={{ ...BTN_GHOST, padding: '3px 10px', fontSize: 11 }}>Remover</button>
                  </div>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label style={LABEL}>Descrição *</label>
                <p style={{ fontSize: 12, color: '#7A8499', margin: '0 0 8px' }}>
                  A primeira mensagem será montada com a descrição do problema, usuário, máquina, telefone e sala da unidade.
                </p>
                <textarea
                  rows={5}
                  style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva o problema com detalhes..."
                />
              </div>

              {/* Anexos de abertura */}
              <div>
                <label style={{ ...LABEL, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Anexos
                  <span style={LABEL_OPT}>(opcional — imagens ou documentos)</span>
                </label>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleFileSelect} />
                {anexosAbertura.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {anexosAbertura.map(a => (
                      <div key={a.id} style={{ position: 'relative', borderRadius: 8, border: '1px solid #E8EBF1', overflow: 'hidden' }}>
                        {a.tipoMime.startsWith('image/') ? (
                          <img src={a.urlArquivo} alt={a.nomeArquivo} style={{ width: 80, height: 64, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ padding: '6px 10px', fontSize: 11, color: '#4A5468', maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.nomeArquivo}
                          </div>
                        )}
                        <button type="button" onClick={() => {
                          setAnexosAbertura(prev => {
                            const idx = prev.findIndex(x => x.id === a.id);
                            if (idx >= 0) setArquivosAbertura(f => f.filter((_, i) => i !== idx));
                            return prev.filter(x => x.id !== a.id);
                          });
                        }} style={{
                          position: 'absolute', top: 2, right: 2, width: 18, height: 18,
                          background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                          color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" style={BTN_GHOST} onClick={() => fileInputRef.current?.click()}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Anexar arquivo
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" style={BTN_GHOST} onClick={() => navTo('chamados')}>Cancelar</button>
                <button type="submit" style={{ ...BTN_PRIMARY, opacity: salvando ? 0.7 : 1 }} disabled={salvando}>
                  {salvando ? 'Abrindo...' : 'Abrir Chamado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── VIEW: Inventário ─────────────────────────────────────────────────────────

function InventarioItemDetalheExpandido({ item }: { item: ItemPatrimonio }) {
  const campos = [
    { label: 'Descrição', value: item.descsbpm || '—' },
    { label: 'Nº de Série', value: item.numserie || '—' },
    { label: 'Marca / Modelo', value: textoMarcaModelo(item) },
    { label: 'CIM BPM', value: item.cimbpm || '—' },
    { label: 'Localização', value: item.localizacao },
    { label: 'Servidor responsável', value: item.servidor === '—' ? '—' : item.servidor },
    ...(item.nomeRede ? [{ label: 'Nome na rede', value: item.nomeRede }] : []),
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '10px 24px',
      padding: '12px 14px 14px 42px',
      background: '#F8F9FF',
      borderTop: '1px solid #E8EBF1',
    }}>
      {campos.map(c => (
        <div key={c.label} style={{ fontSize: 12 }}>
          <span style={{ color: '#7A8499', fontWeight: 600, display: 'block', marginBottom: 2 }}>{c.label}</span>
          <span style={{ color: '#1B2336', fontWeight: 500 }}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function ViewInventario({ navTo, itensPatrimonio, unidades, usuarios, numToUuid, usuarioLogadoId, usuarioPorId, baixas }: ViewProps) {
  const [search, setSearch] = useState('');
  const [tabTipo, setTabTipo] = useState<string>('Todos');
  const [tabStatus, setTabStatus] = useState<string>('Todos');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const itens = itensPatrimonio.length > 0 ? itensPatrimonio : ITENS;
  const unidadeOptions = buildUnidadeOptions(unidades);
  const usuarioOptions = buildUsuarioOptions(usuarios, numToUuid);
  const usuarioLogadoNome = usuarioLogadoId
    ? usuarioPorId(usuarioLogadoId)?.nome
    : undefined;

  const tipos = ['Todos', ...Array.from(new Set(itens.map(i => i.tipo))).sort()];

  const filtered = useMemo(() => {
    return itens.filter(i => {
      const matchSearch = !search || i.patrimonio.includes(search) ||
        i.tipo.toLowerCase().includes(search.toLowerCase()) ||
        i.marca.toLowerCase().includes(search.toLowerCase()) ||
        i.modelo.toLowerCase().includes(search.toLowerCase()) ||
        i.localizacao.toLowerCase().includes(search.toLowerCase()) ||
        i.servidor.toLowerCase().includes(search.toLowerCase());
      const matchTipo = tabTipo === 'Todos' || i.tipo === tabTipo;
      const matchStatus = tabStatus === 'Todos' || normalizarStatusItem(i.statusitem) === tabStatus;
      return matchSearch && matchTipo && matchStatus;
    });
  }, [search, tabTipo, tabStatus, itens]);

  const counts: Record<string, number> = { Todos: itens.length };
  tipos.forEach(t => { if (t !== 'Todos') counts[t] = itens.filter(i => i.tipo === t).length; });

  const countsStatus: Record<string, number> = { Todos: itens.length };
  FILTROS_STATUS_INVENTARIO.forEach(f => {
    if (f.key !== 'Todos') {
      countsStatus[f.key] = itens.filter(i => normalizarStatusItem(i.statusitem) === f.key).length;
    }
  });

  const ativos = countsStatus['Ativo'] ?? 0;
  const estoque = countsStatus['Estoque'] ?? 0;
  const manutencao = countsStatus['Manutenção'] ?? 0;
  const baixados = (countsStatus['Baixado'] ?? 0) + (countsStatus['Descartado'] ?? 0) + (countsStatus['Para Descarte'] ?? 0);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Patrimônio de TI"
        sub={`${itens.length} itens cadastrados`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={BTN_GHOST} onClick={() => navTo('termos')}>
              Termos
            </button>
            <PatrimonioNovoItemButton
              unidades={unidadeOptions}
              usuarios={usuarioOptions}
              trigger={
                <button type="button" style={BTN_PRIMARY}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                  Novo Item
                </button>
              }
            />
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total de Itens" value={itens.length} cor="#0A328D" />
        <KpiCard label="Ativos" value={ativos} cor="#5CC9BD" />
        <KpiCard label="Em Estoque" value={estoque} cor="#0A328D" />
        <KpiCard label="Em Manutenção" value={manutencao} cor="#E56E14" />
        <KpiCard label="Baixados / Descarte" value={baixados} cor="#8A93A6" />
      </div>

      <div style={CARD_STYLE}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#7A8499', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Filtrar por status
        </div>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1', marginBottom: 16, flexWrap: 'wrap' }}>
          {FILTROS_STATUS_INVENTARIO.map(f => (
            <button key={f.key} onClick={() => setTabStatus(f.key)} style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
              fontWeight: tabStatus === f.key ? 700 : 500,
              color: tabStatus === f.key ? '#0A328D' : '#7A8499',
              borderBottom: tabStatus === f.key ? '2px solid #0A328D' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {f.label}
              <span style={{ marginLeft: 5, fontSize: 11, background: tabStatus === f.key ? '#D9E1F4' : '#F2F4F8', color: tabStatus === f.key ? '#0A328D' : '#7A8499', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                {countsStatus[f.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: '#7A8499', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Filtrar por tipo
        </div>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1', marginBottom: 16, flexWrap: 'wrap' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setTabTipo(t)} style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
              fontWeight: tabTipo === t ? 700 : 500,
              color: tabTipo === t ? '#0A328D' : '#7A8499',
              borderBottom: tabTipo === t ? '2px solid #0A328D' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t}
              <span style={{ marginLeft: 5, fontSize: 11, background: tabTipo === t ? '#D9E1F4' : '#F2F4F8', color: tabTipo === t ? '#0A328D' : '#7A8499', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                {counts[t] || 0}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por patrimônio, tipo, marca, modelo, localização..." />
        </div>

        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...TABLE_TH, width: 36 }} />
              {['Patrimônio', 'Tipo', 'Marca', 'Modelo', 'Localização', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ ...TABLE_TH, textAlign: 'left', ...(h === 'Ações' ? { whiteSpace: 'nowrap' } : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#7A8499', fontSize: 14 }}>Nenhum item encontrado.</td></tr>
            )}
            {filtered.map(i => {
              const expanded = expandedId === i.idbem;
              return (
                <Fragment key={i.idbem}>
                  <tr
                    style={{
                      borderTop: '1px solid #F2F4F8',
                      background: expanded ? '#FAFBFD' : undefined,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!expanded) (e.currentTarget.style.background = '#FAFBFD'); }}
                    onMouseLeave={e => { if (!expanded) (e.currentTarget.style.background = ''); }}
                  >
                    <td style={{ padding: '10px 8px 10px 14px', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : i.idbem)}
                        title={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer', padding: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A8499" strokeWidth="2"
                          style={{ display: 'block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0A328D' }}>
                      <button
                        type="button"
                        onClick={() => navTo('item-detalhe', i.idbem)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit', fontWeight: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      >
                        {i.patrimonio}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499' }}>{i.tipo}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{i.marca || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>{i.modelo || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499' }}>{i.localizacao}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <StatusItemBadge status={i.statusitem} />
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <InventarioItemAcoes
                        item={i}
                        unidades={unidadeOptions}
                        usuarios={usuarioOptions}
                        numToUuid={numToUuid}
                        usuarioLogadoNome={usuarioLogadoNome}
                        baixas={baixas}
                        inline
                      />
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <InventarioItemDetalheExpandido item={i} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW: Item Detalhe ───────────────────────────────────────────────────────

function ViewItemDetalhe({ navTo, chamados, activeId, itensPatrimonio, unidades, usuarios, numToUuid, usuarioLogadoId, usuarioPorId, transferencias, baixas, statusHistorico }: ViewProps) {
  const item = itemPorIdFrom(itensPatrimonio, activeId!) ?? ITENS.find(i => i.idbem === activeId);

  if (!item) {
    return (
      <div style={{ padding: 24 }}>
        <button style={BTN_GHOST} onClick={() => navTo('inventario')}>← Voltar</button>
        <p style={{ marginTop: 16, color: '#7A8499' }}>Item não encontrado.</p>
      </div>
    );
  }

  const chamadosItem = chamados.filter(c => c.item === item.idbem);
  const unidadeOptions = buildUnidadeOptions(unidades);
  const usuarioOptions = buildUsuarioOptions(usuarios, numToUuid);
  const usuarioLogadoNome = usuarioLogadoId
    ? usuarioPorId(usuarioLogadoId)?.nome
    : undefined;
  const baixasItem = baixas.filter(b => b.idItem === item.idbem);
  const historicoItem = statusHistorico.filter(h => h.idItem === item.idbem);
  const transferenciasItem = transferencias
    .filter(t => t.itens.some(i => i.idItem === item.idbem))
    .map(t => ({
      ...t,
      itemTransf: t.itens.find(i => i.idItem === item.idbem)!,
    }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button style={BTN_GHOST} onClick={() => navTo('inventario')}>← Voltar</button>
        <span style={{ fontSize: 13, color: '#7A8499' }}>Patrimônio</span>
        <span style={{ fontSize: 13, color: '#7A8499' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.patrimonio}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Item info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={CARD_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 6px' }}>{item.descsbpm}</h2>
                <span style={{ fontSize: 12, color: '#7A8499', background: '#F2F4F8', padding: '2px 10px', borderRadius: 12 }}>{item.tipo}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <StatusItemBadge status={item.statusitem} />
                <InventarioItemAcoes
                  item={item}
                  unidades={unidadeOptions}
                  usuarios={usuarioOptions}
                  numToUuid={numToUuid}
                  usuarioLogadoNome={usuarioLogadoNome}
                  baixas={baixas}
                />
              </div>
            </div>
            {[
              { label: 'Nº Patrimônio', value: item.patrimonio },
              { label: 'Nº de Série', value: item.numserie || '—' },
              { label: 'Marca/Modelo', value: textoMarcaModelo(item) },
              { label: 'CIM BPM', value: item.cimbpm || '—' },
              { label: 'Localização', value: item.localizacao },
              { label: 'Servidor responsável', value: item.servidor },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F2F4F8', fontSize: 13 }}>
                <span style={{ color: '#7A8499', fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Linked tickets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={CARD_STYLE}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Chamados Vinculados ({chamadosItem.length})</div>
            {chamadosItem.length === 0 ? (
              <div style={{ fontSize: 13, color: '#7A8499', padding: '12px 0' }}>Nenhum chamado vinculado a este item.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chamadosItem.map(c => (
                  <div key={c.id}
                    style={{ background: '#FAFBFD', borderRadius: 8, padding: 12, cursor: 'pointer', border: '1px solid #F2F4F8' }}
                    onClick={() => navTo('chamado-detalhe', c.id)}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F9')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FAFBFD')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A328D' }}>#{c.id}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.titulo}</div>
                    <div style={{ fontSize: 11, color: '#7A8499', marginTop: 3 }}>{tempoRelativo(c.abertura)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {baixasItem.length > 0 && (
            <div style={CARD_STYLE}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Registro de Baixa</div>
              {baixasItem.map(b => (
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Data da baixa', value: fmtData(b.dataBaixa) },
                    { label: 'Baixado por', value: b.usuarioBaixa },
                    { label: 'Documento SBPM', value: b.documentoSbpm },
                    { label: 'Observações', value: b.observacao || '—' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F2F4F8', fontSize: 13 }}>
                      <span style={{ color: '#7A8499', fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div style={CARD_STYLE}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Histórico de Status ({historicoItem.length})</div>
            {historicoItem.length === 0 ? (
              <div style={{ fontSize: 13, color: '#7A8499', padding: '12px 0' }}>Nenhuma alteração de status registrada.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historicoItem.map((h, i) => (
                  <div key={h.id} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: i < historicoItem.length - 1 ? '1px solid #F2F4F8' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: metaStatusItem(h.statusNovo).corText, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {h.statusAnterior ? (
                          <>
                            <StatusItemBadge status={h.statusAnterior} />
                            <span style={{ fontSize: 12, color: '#7A8499' }}>→</span>
                          </>
                        ) : null}
                        <StatusItemBadge status={h.statusNovo} />
                      </div>
                      <div style={{ fontSize: 12, color: '#4A5468', marginTop: 4 }}>{h.motivo}</div>
                      <div style={{ fontSize: 11, color: '#7A8499', marginTop: 3 }}>
                        {fmtData(h.criadoEm)} · {h.usuario}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={CARD_STYLE}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Histórico de Transferências</div>
            {transferenciasItem.length === 0 ? (
              <div style={{ fontSize: 13, color: '#7A8499', padding: '12px 0' }}>Nenhuma transferência registrada para este item.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {transferenciasItem.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: i < transferenciasItem.length - 1 ? '1px solid #F2F4F8' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0A328D', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Transferido para {t.unidadeDestino}
                      </div>
                      <div style={{ fontSize: 12, color: '#4A5468', marginTop: 2 }}>
                        {t.itemTransf.servidorAnterior} → {t.itemTransf.servidorAtual}
                      </div>
                      <div style={{ fontSize: 11, color: '#7A8499', marginTop: 3 }}>
                        {fmtData(t.dataTransferencia)} · Doc. {t.cimbpm}
                        {t.observacao ? ` · ${t.observacao}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW: Movimentações ──────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#7A8499',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
};

const TD_STYLE: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 13,
  color: '#1B2336',
  verticalAlign: 'middle',
};

function ViewMovimentacoes({ navTo, transferencias, baixas, statusHistorico, usuarioPorId, itensPatrimonio, initialAbaMovimentacao }: ViewProps) {
  const [aba, setAba] = useState<AbaMovimentacao>(initialAbaMovimentacao ?? 'transferencia');

  const tabs: Array<{ key: AbaMovimentacao; label: string; count: number }> = [
    { key: 'transferencia', label: 'Transferência', count: transferencias.length },
    { key: 'baixa', label: 'Baixa', count: baixas.length },
    { key: 'status', label: 'Status', count: statusHistorico.length },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Movimentações"
        sub={`${transferencias.length + baixas.length + statusHistorico.length} registros`}
        action={aba === 'transferencia' ? (
          <button style={BTN_PRIMARY} onClick={() => navTo('nova-transferencia')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Nova Transferência
          </button>
        ) : undefined}
      />

      <div style={{ ...CARD_STYLE, marginBottom: 24, padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setAba(t.key)} style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
              fontWeight: aba === t.key ? 700 : 500,
              color: aba === t.key ? '#0A328D' : '#7A8499',
              borderBottom: aba === t.key ? '2px solid #0A328D' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
              <span style={{ marginLeft: 5, fontSize: 11, background: aba === t.key ? '#D9E1F4' : '#F2F4F8', color: aba === t.key ? '#0A328D' : '#7A8499', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {aba === 'transferencia' && (
        <ConteudoTransferencias transferencias={transferencias} usuarioPorId={usuarioPorId} itensPatrimonio={itensPatrimonio} />
      )}
      {aba === 'baixa' && (
        <ConteudoBaixas baixas={baixas} navTo={navTo} />
      )}
      {aba === 'status' && (
        <ConteudoStatusHistorico statusHistorico={statusHistorico} navTo={navTo} />
      )}
    </div>
  );
}

function ConteudoTransferencias({ transferencias, usuarioPorId, itensPatrimonio }: Pick<ViewProps, 'transferencias' | 'usuarioPorId' | 'itensPatrimonio'>) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return transferencias.filter(t =>
      !search || t.cimbpm.toLowerCase().includes(search.toLowerCase()) ||
      t.unidadeDestino.toLowerCase().includes(search.toLowerCase()) ||
      t.observacao.toLowerCase().includes(search.toLowerCase())
    );
  }, [transferencias, search]);

  const totalItens = transferencias.reduce((s, t) => s + t.itens.length, 0);

  function itemLocal(id: number) {
    return itensPatrimonio.find(i => i.idbem === id) ?? null;
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total de Transferências" value={transferencias.length} cor="#0A328D" />
        <KpiCard label="Itens Movimentados" value={totalItens} cor="#5CC9BD" />
        <KpiCard label="Unidades Atendidas" value={new Set(transferencias.map(t => t.unidadeDestino)).size} cor="#EDBA94" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por CIM, unidade, observação..." />
      </div>

      <div style={CARD_STYLE}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#7A8499', fontSize: 14 }}>
            Nenhuma transferência encontrada.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8EBF1' }}>
                <th style={TH_STYLE}>CIM</th>
                <th style={TH_STYLE}>Data</th>
                <th style={TH_STYLE}>Destino</th>
                <th style={{ ...TH_STYLE, textAlign: 'center' }}>Itens</th>
                <th style={TH_STYLE}>Registrado por</th>
                <th style={TH_STYLE}>Observação</th>
                <th style={{ ...TH_STYLE, width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const reg = usuarioPorId(t.idUsuarioRegistro);
                const expanded = expandedId === t.id;
                return (
                  <Fragment key={t.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : t.id)}
                      style={{
                        borderBottom: expanded ? 'none' : '1px solid #F2F4F8',
                        cursor: 'pointer',
                        background: expanded ? '#F8F9FF' : undefined,
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ ...TD_STYLE, fontWeight: 700, color: '#0A328D' }}>{t.cimbpm}</td>
                      <td style={{ ...TD_STYLE, color: '#4A5468', whiteSpace: 'nowrap' }}>{fmtData(t.dataTransferencia)}</td>
                      <td style={TD_STYLE}>{t.unidadeDestino}</td>
                      <td style={{ ...TD_STYLE, textAlign: 'center' }}>
                        <span style={{ background: '#D9E1F4', color: '#0A328D', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                          {t.itens.length}
                        </span>
                      </td>
                      <td style={{ ...TD_STYLE, color: '#4A5468' }}>{reg?.nome || '—'}</td>
                      <td style={{ ...TD_STYLE, color: '#7A8499', maxWidth: 220 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {t.observacao || '—'}
                        </span>
                      </td>
                      <td style={{ ...TD_STYLE, paddingRight: 16 }}>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A8499" strokeWidth="2"
                          style={{ display: 'block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </td>
                    </tr>
                    {expanded && (
                      <tr style={{ borderBottom: '1px solid #F2F4F8' }}>
                        <td colSpan={7} style={{ padding: '0 14px 14px' }}>
                          <div style={{ background: '#F4F5F9', borderRadius: 10, padding: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#7A8499', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                              Itens transferidos
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #E8EBF1' }}>
                                  <th style={{ ...TH_STYLE, fontSize: 10 }}>Patrimônio</th>
                                  <th style={{ ...TH_STYLE, fontSize: 10 }}>Marca/Modelo</th>
                                  <th style={{ ...TH_STYLE, fontSize: 10 }}>Servidor anterior</th>
                                  <th style={{ ...TH_STYLE, fontSize: 10 }}>Servidor atual</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.itens.map(ti => {
                                  const it = itemLocal(ti.idItem);
                                  const patrimonio = ti.patrimonio || it?.patrimonio || `#${ti.idItem}`;
                                  const equipamento = it
                                    ? rotuloEquipamentoTransferencia(it)
                                    : (ti.descricao || '—');
                                  return (
                                    <tr key={ti.id} style={{ borderBottom: '1px solid #EAEDF2' }}>
                                      <td style={{ ...TD_STYLE, fontSize: 12, fontWeight: 700, color: '#0A328D' }}>{patrimonio}</td>
                                      <td style={{ ...TD_STYLE, fontSize: 12, color: '#4A5468' }}>{equipamento}</td>
                                      <td style={{ ...TD_STYLE, fontSize: 12, color: '#7A8499' }}>{ti.servidorAnterior}</td>
                                      <td style={{ ...TD_STYLE, fontSize: 12, color: '#1B2336' }}>{ti.servidorAtual}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function ConteudoStatusHistorico({
  statusHistorico,
  navTo,
}: Pick<ViewProps, 'statusHistorico' | 'navTo'>) {
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return statusHistorico.filter(h => {
      const matchStatus = filtroStatus === 'Todos' || h.statusNovo === filtroStatus;
      const matchSearch = !search ||
        h.patrimonio.toLowerCase().includes(q) ||
        h.descricao.toLowerCase().includes(q) ||
        h.usuario.toLowerCase().includes(q) ||
        h.motivo.toLowerCase().includes(q) ||
        h.statusNovo.toLowerCase().includes(q) ||
        h.statusAnterior.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [statusHistorico, search, filtroStatus]);

  const countsStatus: Record<string, number> = { Todos: statusHistorico.length };
  FILTROS_STATUS_INVENTARIO.forEach(f => {
    if (f.key !== 'Todos') {
      countsStatus[f.key] = statusHistorico.filter(h => h.statusNovo === f.key).length;
    }
  });

  const itensUnicos = new Set(statusHistorico.map(h => h.idItem)).size;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total de Alterações" value={statusHistorico.length} cor="#0A328D" />
        <KpiCard label="Itens Afetados" value={itensUnicos} cor="#5CC9BD" />
        <KpiCard label="Última Alteração" value={statusHistorico[0] ? fmtDataCurta(statusHistorico[0].criadoEm) : '—'} cor="#EDBA94" />
      </div>

      <div style={{ ...CARD_STYLE, marginBottom: 16, padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1', flexWrap: 'wrap' }}>
          {FILTROS_STATUS_INVENTARIO.map(f => (
            <button key={f.key} onClick={() => setFiltroStatus(f.key)} style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
              fontWeight: filtroStatus === f.key ? 700 : 500,
              color: filtroStatus === f.key ? '#0A328D' : '#7A8499',
              borderBottom: filtroStatus === f.key ? '2px solid #0A328D' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {f.label}
              <span style={{ marginLeft: 5, fontSize: 11, background: filtroStatus === f.key ? '#D9E1F4' : '#F2F4F8', color: filtroStatus === f.key ? '#0A328D' : '#7A8499', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                {countsStatus[f.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por patrimônio, motivo, usuário, status..." />
      </div>

      <div style={CARD_STYLE}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#7A8499', fontSize: 14 }}>
            Nenhuma alteração de status encontrada.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8EBF1' }}>
                <th style={TH_STYLE}>Patrimônio</th>
                <th style={TH_STYLE}>Data</th>
                <th style={TH_STYLE}>De → Para</th>
                <th style={TH_STYLE}>Motivo</th>
                <th style={TH_STYLE}>Alterado por</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr
                  key={h.id}
                  onClick={() => navTo('item-detalhe', h.idItem)}
                  style={{ borderBottom: '1px solid #F2F4F8', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8F9FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={{ ...TD_STYLE, fontWeight: 700, color: '#0A328D' }}>{h.patrimonio}</td>
                  <td style={{ ...TD_STYLE, color: '#4A5468', whiteSpace: 'nowrap' }}>{fmtData(h.criadoEm)}</td>
                  <td style={TD_STYLE}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {h.statusAnterior ? <StatusItemBadge status={h.statusAnterior} /> : <span style={{ fontSize: 12, color: '#7A8499' }}>—</span>}
                      <span style={{ fontSize: 12, color: '#7A8499' }}>→</span>
                      <StatusItemBadge status={h.statusNovo} />
                    </div>
                  </td>
                  <td style={{ ...TD_STYLE, color: '#7A8499', maxWidth: 280 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {h.motivo || '—'}
                    </span>
                  </td>
                  <td style={{ ...TD_STYLE, color: '#4A5468' }}>{h.usuario || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function ConteudoBaixas({ baixas, navTo }: Pick<ViewProps, 'baixas' | 'navTo'>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baixas.filter(b =>
      !search ||
      b.patrimonio.toLowerCase().includes(q) ||
      b.descricao.toLowerCase().includes(q) ||
      b.usuarioBaixa.toLowerCase().includes(q) ||
      b.documentoSbpm.toLowerCase().includes(q) ||
      b.observacao.toLowerCase().includes(q)
    );
  }, [baixas, search]);

  const itensUnicos = new Set(baixas.map(b => b.idItem)).size;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total de Baixas" value={baixas.length} cor="#0A328D" />
        <KpiCard label="Itens Baixados" value={itensUnicos} cor="#8A93A6" />
        <KpiCard label="Última Baixa" value={baixas[0] ? fmtDataCurta(baixas[0].dataBaixa) : '—'} cor="#EDBA94" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por patrimônio, documento, responsável..." />
      </div>

      <div style={CARD_STYLE}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#7A8499', fontSize: 14 }}>
            Nenhuma baixa encontrada.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E8EBF1' }}>
                <th style={TH_STYLE}>Patrimônio</th>
                <th style={TH_STYLE}>Descrição</th>
                <th style={TH_STYLE}>Data</th>
                <th style={TH_STYLE}>Baixado por</th>
                <th style={TH_STYLE}>Documento SBPM</th>
                <th style={TH_STYLE}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr
                  key={b.id}
                  onClick={() => navTo('item-detalhe', b.idItem)}
                  style={{ borderBottom: '1px solid #F2F4F8', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#F8F9FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={{ ...TD_STYLE, fontWeight: 700, color: '#0A328D' }}>{b.patrimonio}</td>
                  <td style={{ ...TD_STYLE, color: '#4A5468', maxWidth: 220 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {b.descricao || '—'}
                    </span>
                  </td>
                  <td style={{ ...TD_STYLE, color: '#4A5468', whiteSpace: 'nowrap' }}>{fmtData(b.dataBaixa)}</td>
                  <td style={{ ...TD_STYLE, color: '#4A5468' }}>{b.usuarioBaixa || '—'}</td>
                  <td style={{ ...TD_STYLE, fontWeight: 600, color: '#1B2336' }}>{b.documentoSbpm || '—'}</td>
                  <td style={{ ...TD_STYLE, color: '#7A8499', maxWidth: 220 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {b.observacao || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── VIEW: Nova Transferência (wizard) ────────────────────────────────────────

function ViewNovaTransferencia({ navTo, setTransferencias, unidades, itensPatrimonio }: ViewProps) {
  const [step, setStep] = useState(1);
  const [unidadeId, setUnidadeId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [servidores, setServidores] = useState<Record<number, string>>({});
  const [searchItem, setSearchItem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const unidade = unidades.find(u => String(u.id) === unidadeId);

  const itemsFiltrados = useMemo(() => {
    const q = searchItem.toLowerCase();
    return itensPatrimonio.filter(i =>
      !searchItem ||
      i.patrimonio.includes(searchItem) ||
      i.tipo.toLowerCase().includes(q) ||
      i.marca.toLowerCase().includes(q) ||
      i.modelo.toLowerCase().includes(q) ||
      i.descsbpm.toLowerCase().includes(q) ||
      i.localizacao.toLowerCase().includes(q)
    );
  }, [itensPatrimonio, searchItem]);

  function toggleItem(id: number) {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function confirmar() {
    setSalvando(true);
    setErroSalvar(null);
    try {
      const res = await fetch('/api/helpdesk/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unidadeId,
          observacao,
          itens: selectedItems.map(idIt => {
            const it = itemPorIdFrom(itensPatrimonio, idIt);
            return {
              idItem: idIt,
              servidorAnterior: it?.servidor || '—',
              servidorAtual: servidores[idIt] || '—',
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setTransferencias(prev => [data.transferencia, ...prev]);
      navTo('movimentacoes');
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  }

  const steps = ['Destino', 'Itens', 'Servidores', 'Confirmação'];

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button style={BTN_GHOST} onClick={() => navTo('movimentacoes')}>← Voltar</button>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Nova Transferência</h1>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: i + 1 < step ? '#5CC9BD' : i + 1 === step ? '#0A328D' : '#E8EBF1',
                color: i + 1 <= step ? '#fff' : '#7A8499',
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i + 1 === step ? '#0A328D' : '#7A8499', fontWeight: i + 1 === step ? 700 : 400, whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i + 1 < step ? '#5CC9BD' : '#E8EBF1', marginBottom: 18, margin: '0 8px 18px' }} />
            )}
          </div>
        ))}
      </div>

      <div style={CARD_STYLE}>
        {/* Step 1: Destination */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Unidade Destino</h3>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Unidade *</label>
              <select style={INPUT_STYLE} value={unidadeId} onChange={e => setUnidadeId(e.target.value)}>
                <option value="">Selecione a unidade...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.full}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Observação</label>
              <textarea rows={3} style={{ ...INPUT_STYLE, fontFamily: 'inherit', resize: 'vertical' }}
                value={observacao} onChange={e => setObservacao(e.target.value)}
                placeholder="Motivo da transferência, processo SEI, etc." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={BTN_PRIMARY} onClick={() => { if (unidadeId) setStep(2); }} disabled={!unidadeId}>Próximo →</button>
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Selecionar Itens</h3>
            <SearchInput value={searchItem} onChange={setSearchItem} placeholder="Buscar por patrimônio, tipo, marca ou modelo..." />
            <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #E8EBF1', borderRadius: 8 }}>
              {itemsFiltrados.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#7A8499', fontSize: 13 }}>
                  {itensPatrimonio.length === 0 ? 'Nenhum item de patrimônio cadastrado.' : 'Nenhum item encontrado.'}
                </div>
              )}
              {itemsFiltrados.map(i => (
                <div key={i.idbem}
                  onClick={() => toggleItem(i.idbem)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderBottom: '1px solid #F2F4F8', cursor: 'pointer',
                    background: selectedItems.includes(i.idbem) ? '#F0F4FF' : '#fff',
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: `2px solid ${selectedItems.includes(i.idbem) ? '#0A328D' : '#CBD1DB'}`,
                    background: selectedItems.includes(i.idbem) ? '#0A328D' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {selectedItems.includes(i.idbem) && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0A328D' }}>{i.patrimonio || '—'}</div>
                    <div style={{ fontSize: 11, color: '#7A8499' }}>{rotuloEquipamentoTransferencia(i)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#7A8499' }}>{selectedItems.length} item(ns) selecionado(s)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={BTN_GHOST} onClick={() => setStep(1)}>← Anterior</button>
              <button style={BTN_PRIMARY} onClick={() => { if (selectedItems.length > 0) setStep(3); }} disabled={selectedItems.length === 0}>Próximo →</button>
            </div>
          </div>
        )}

        {/* Step 3: Servers */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Responsáveis / Servidores</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedItems.map(id => {
                const it = itemPorIdFrom(itensPatrimonio, id);
                return (
                  <div key={id} style={{ background: '#FAFBFD', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      <span style={{ color: '#0A328D' }}>{it?.patrimonio || '—'}</span>
                      {it ? <span style={{ color: '#4A5468', fontWeight: 500 }}> — {rotuloEquipamentoTransferencia(it)}</span> : null}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#7A8499', display: 'block', marginBottom: 4 }}>Servidor Anterior</label>
                        <input style={{ ...INPUT_STYLE, fontSize: 12 }} value={it?.servidor || ''} readOnly />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#7A8499', display: 'block', marginBottom: 4 }}>Servidor Atual</label>
                        <input style={{ ...INPUT_STYLE, fontSize: 12 }}
                          value={servidores[id] || ''}
                          onChange={e => setServidores(prev => ({ ...prev, [id]: e.target.value }))}
                          placeholder="Nome do servidor..." />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={BTN_GHOST} onClick={() => setStep(2)}>← Anterior</button>
              <button style={BTN_PRIMARY} onClick={() => setStep(4)}>Próximo →</button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Confirmação</h3>
            <div style={{ background: '#F4F5F9', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#7A8499' }}>Unidade destino</span>
                  <span style={{ fontWeight: 700 }}>{unidade?.full}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#7A8499' }}>Itens</span>
                  <span style={{ fontWeight: 700 }}>{selectedItems.length}</span>
                </div>
                {observacao && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#7A8499' }}>Observação</span>
                    <span style={{ fontWeight: 600, maxWidth: 300, textAlign: 'right' }}>{observacao}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Itens a transferir:</div>
            {selectedItems.map(id => {
              const it = itemPorIdFrom(itensPatrimonio, id);
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAFBFD', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#0A328D', minWidth: 100 }}>{it?.patrimonio}</span>
                  <span style={{ color: '#4A5468', flex: 1 }}>{it ? rotuloEquipamentoTransferencia(it) : '—'}</span>
                  <span style={{ color: '#7A8499' }}>{it?.servidor} → {servidores[id] || '—'}</span>
                </div>
              );
            })}
            {erroSalvar && (
              <div style={{ color: '#C0392B', fontSize: 13 }}>{erroSalvar}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button style={BTN_GHOST} onClick={() => setStep(3)} disabled={salvando}>← Anterior</button>
              <button style={BTN_PRIMARY} onClick={confirmar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VIEW: Usuários ───────────────────────────────────────────────────────────

function ViewUsuarios({ navTo, usuarios }: ViewProps) {
  const [tabPerfil, setTabPerfil] = useState<'todos' | 'ADM' | 'TEC' | 'USR'>('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return usuarios.filter(u => {
      const matchPerfil = tabPerfil === 'todos' || u.perfil === tabPerfil;
      const matchSearch = !search || u.nome.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      return matchPerfil && matchSearch;
    });
  }, [tabPerfil, search, usuarios]);

  const tabs = [
    { key: 'todos' as const, label: 'Todos', count: usuarios.length },
    { key: 'ADM' as const, label: 'Administradores', count: usuarios.filter(u => u.perfil === 'ADM').length },
    { key: 'TEC' as const, label: 'Técnicos', count: usuarios.filter(u => u.perfil === 'TEC').length },
    { key: 'USR' as const, label: 'Usuários', count: usuarios.filter(u => u.perfil === 'USR').length },
  ];

  const perfilColors: Record<string, { bg: string; text: string }> = {
    ADM: { bg: '#FBDADA', text: '#7A1F1F' },
    TEC: { bg: '#D9E1F4', text: '#0A328D' },
    USR: { bg: '#EEF2F7', text: '#4A5468' },
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Usuários" sub={`${usuarios.length} usuários cadastrados`} />

      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E8EBF1', marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTabPerfil(t.key)} style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 13,
              fontWeight: tabPerfil === t.key ? 700 : 500,
              color: tabPerfil === t.key ? '#0A328D' : '#7A8499',
              borderBottom: tabPerfil === t.key ? '2px solid #0A328D' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
              <span style={{ marginLeft: 5, fontSize: 11, background: tabPerfil === t.key ? '#D9E1F4' : '#F2F4F8', color: tabPerfil === t.key ? '#0A328D' : '#7A8499', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail, unidade..." />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Usuário', 'Nome', 'Perfil', 'E-mail', 'Status'].map(h => (
                <th key={h} style={{ ...TABLE_TH, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const pc = perfilColors[u.perfil];
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #F2F4F8' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar nome={u.nome} size={30} bg={u.perfil === 'TEC' ? '#1B2336' : '#0A328D'} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#4A5468' }}>{u.usuario}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{u.nome}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 12, padding: '3px 10px', background: pc.bg, color: pc.text }}>{u.perfil}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#7A8499' }}>{u.email}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '3px 10px',
                      background: u.statususer === 'Ativo' ? '#D1EBE8' : '#E8EAF0',
                      color: u.statususer === 'Ativo' ? '#0F4F4A' : '#3D4658',
                    }}>{u.statususer}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── VIEW: Relatórios ─────────────────────────────────────────────────────────

type TabRelatorio = 'geral' | TipoChamado;

function RelatorioTempoAtendimento({ chamados, cor }: { chamados: Chamado[]; cor: string }) {
  const metricas = useMemo(() => metricasTempoAtendimento(chamados), [chamados]);

  const medianaFmt = metricas.medianaMs !== null ? formatarDuracaoMs(metricas.medianaMs) : '—';
  const mediaFmt = metricas.mediaMs !== null ? formatarDuracaoMs(metricas.mediaMs) : '—';
  const prodamFmt = metricas.prodamMedianaMs !== null ? formatarDuracaoMs(metricas.prodamMedianaMs) : '—';

  return (
    <div style={{ ...CARD_STYLE, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Tempo de atendimento</div>
      <p style={{ fontSize: 12, color: '#7A8499', margin: '0 0 16px', lineHeight: 1.5 }}>
        Da abertura até a resolução, descontando o período em Aguardando PRODAM.
        A <strong>mediana</strong> indica o tempo típico; a média pode ser distorcida por casos excepcionais.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          label="Tempo mediano"
          value={medianaFmt}
          cor={cor}
          sub={metricas.amostra > 0 ? `${metricas.amostra} chamado(s) encerrado(s)` : 'Sem dados'}
        />
        <KpiCard label="Tempo médio" value={mediaFmt} cor="#8A93A6" sub="Pode incluir outliers" />
        <KpiCard
          label="Mediana em PRODAM"
          value={prodamFmt}
          cor="#9A68C0"
          sub="Tempo descontado do atendimento"
        />
        <KpiCard
          label="Chamados encerrados"
          value={metricas.amostra}
          cor="#0A328D"
          sub={`de ${chamados.length} no período`}
        />
      </div>
    </div>
  );
}

function RelatorioConteudoArea({
  chamados,
  usuarios,
  titulo,
  cor,
  mostrarPatrimonio,
}: {
  chamados: Chamado[];
  usuarios: Usuario[];
  titulo: string;
  cor: string;
  mostrarPatrimonio?: boolean;
}) {
  const statusData = (['aberto', 'atendimento', 'aguardando', 'prodam', 'resolvido', 'fechado'] as StatusChamado[]).map(s => ({
    nome: STATUS_META[s].label,
    valor: chamados.filter(c => c.status === s).length,
    cor: STATUS_META[s].cor,
  }));

  const catCount: Record<string, number> = {};
  chamados.forEach(c => {
    const p = c.categoria.split(' > ')[0];
    catCount[p] = (catCount[p] || 0) + 1;
  });
  const catData = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
  const catMax = catData[0]?.[1] || 1;

  const tecStats = usuarios
    .filter(u => u.perfil === 'TEC' || u.perfil === 'ADM')
    .map(u => {
      const meus = chamados.filter(c => c.tecnicos.includes(u.id));
      const resolvidos = meus.filter(c => c.status === 'resolvido' || c.status === 'fechado').length;
      return { nome: u.nome, total: meus.length, resolvidos, emAndamento: meus.filter(c => c.status === 'atendimento').length };
    })
    .filter(t => t.total > 0);

  const tipoCount: Record<string, number> = {};
  ITENS.forEach(i => { tipoCount[i.tipo] = (tipoCount[i.tipo] || 0) + 1; });
  const tipoSegments = Object.entries(tipoCount).map(([nome, valor], idx) => ({
    nome, valor, cor: ['#0A328D', '#5CC9BD', '#E56E14', '#EDBA94', '#8A93A6', '#7C3AED', '#EC4899'][idx % 7],
  }));

  return (
    <>
      <RelatorioTempoAtendimento chamados={chamados} cor={cor} />

      <div style={{ display: 'grid', gridTemplateColumns: mostrarPatrimonio ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 20 }}>
        <div style={CARD_STYLE}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            {titulo ? `Chamados por Categoria — ${titulo}` : 'Chamados por Categoria'}
          </div>
          {catData.length === 0 ? (
            <p style={{ fontSize: 13, color: '#7A8499', margin: 0 }}>Nenhum chamado nesta área.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catData.map(([cat, count]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#4A5468', fontWeight: 500 }}>{cat}</span>
                    <span style={{ fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: '#F2F4F8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / catMax) * 100}%`, height: '100%', background: cor, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {mostrarPatrimonio && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={CARD_STYLE}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Patrimônio por Tipo</div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <DonutChart segments={tipoSegments} total={ITENS.length} />
                <div style={{ flex: 1 }}>
                  {tipoSegments.map(s => (
                    <div key={s.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.cor, flexShrink: 0 }} />
                        <span style={{ color: '#4A5468' }}>{s.nome}</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{s.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ ...CARD_STYLE, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Chamados por Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {statusData.map(s => (
            <div key={s.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.cor }} />
                <span>{s.nome}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, height: 6, background: '#F2F4F8', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${chamados.length ? (s.valor / chamados.length) * 100 : 0}%`, height: '100%', background: s.cor, borderRadius: 3 }} />
                </div>
                <span style={{ fontWeight: 700, minWidth: 16 }}>{s.valor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {tecStats.length > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Desempenho por Técnico</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Técnico', 'Total', 'Em andamento', 'Resolvidos', 'Taxa'].map(h => (
                  <th key={h} style={{ ...TABLE_TH, textAlign: h === 'Técnico' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tecStats.map(t => {
                const taxa = t.total > 0 ? Math.round((t.resolvidos / t.total) * 100) : 0;
                return (
                  <tr key={t.nome} style={{ borderTop: '1px solid #F2F4F8' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar nome={t.nome} size={28} bg="#1B2336" />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{t.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{t.total}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, background: '#FCE5D0', color: '#7A3A0B', borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>{t.emAndamento}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, background: '#D9E1F4', color: '#0A328D', borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>{t.resolvidos}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#F2F4F8', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${taxa}%`, height: '100%', background: taxa >= 70 ? '#5CC9BD' : '#E56E14', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{taxa}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ViewRelatorios({ chamados, usuarios, transferencias }: ViewProps) {
  const [tab, setTab] = useState<TabRelatorio>('geral');

  const chamadosPorArea = useMemo(() => {
    const mapa = Object.fromEntries(TIPOS_CHAMADO.map(t => [t, [] as Chamado[]])) as Record<TipoChamado, Chamado[]>;
    chamados.forEach(c => {
      const area = c.areaAtual ?? c.areaOrigem;
      if (area && mapa[area]) mapa[area].push(c);
    });
    return mapa;
  }, [chamados]);

  const tabs: Array<{ key: TabRelatorio; label: string; count: number; cor: string }> = [
    { key: 'geral', label: 'Visão geral', count: chamados.length, cor: '#0A328D' },
    ...TIPOS_CHAMADO.map(t => ({
      key: t as TabRelatorio,
      label: TIPO_CHAMADO_META[t].label,
      count: chamadosPorArea[t].length,
      cor: TIPO_CHAMADO_META[t].cor,
    })),
  ];

  const tabAtiva = tabs.find(t => t.key === tab) ?? tabs[0];
  const chamadosTab = tab === 'geral' ? chamados : chamadosPorArea[tab];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Relatórios" sub="Análises e estatísticas do Help Desk" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total de Chamados" value={chamados.length} cor="#0A328D" />
        <KpiCard label="Total de Itens" value={ITENS.length} cor="#5CC9BD" />
        <KpiCard label="Técnicos Ativos" value={usuarios.filter(u => u.perfil === 'TEC').length} cor="#EDBA94" />
        <KpiCard label="Transferências" value={transferencias.length} cor="#E56E14" />
      </div>

      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid #E8EBF1', marginBottom: 20, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? t.cor : '#7A8499',
                borderBottom: tab === t.key ? `2px solid ${t.cor}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
              <span style={{
                marginLeft: 5,
                fontSize: 11,
                background: tab === t.key ? `${t.cor}22` : '#F2F4F8',
                color: tab === t.key ? t.cor : '#7A8499',
                borderRadius: 10,
                padding: '1px 7px',
                fontWeight: 600,
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <RelatorioConteudoArea
          chamados={chamadosTab}
          usuarios={usuarios}
          titulo={tab === 'geral' ? '' : tabAtiva.label}
          cor={tabAtiva.cor}
          mostrarPatrimonio={tab === 'geral'}
        />
      </div>
    </div>
  );
}
