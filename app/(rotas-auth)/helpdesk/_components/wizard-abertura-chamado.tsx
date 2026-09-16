'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AutocompleteInput, resolveCategoriaId } from './hd-app';
import { categoriaCompativelComArea } from '@/lib/helpdesk/tipos-chamado';
import { normalizarStatusItem } from '@/lib/helpdesk/item-patrimonio';
import { TIPO_CHAMADO_META, exigeComputadorNaAbertura } from '../_types';
import type { Categoria, Chamado, ItemPatrimonio, Prioridade, TipoChamado, Unidade, Usuario } from '../_types';

// ─── Tipos do assistente ───────────────────────────────────────────────────

type PrioridadeLabel = 'Normal' | 'Alta' | 'Máxima';

interface Answers {
  paraOutraPessoa: boolean;
  colega: Usuario | null;
  area: TipoChamado | null;
  subcategoria: string;
  categoriaPai: string;
  categoriaFilho: string;
  sistema: string;
  unidade: Unidade | null;
  local: string;
  abrangencia: string;
  descricao: string;
  urgent: boolean;
  prioridadeLabel: PrioridadeLabel;
  itemManual: ItemPatrimonio | null;
}

type IconeOpcao = 'monitor' | 'phone' | 'key' | 'wifi' | 'wrench' | 'help';

interface OpcaoStep {
  label: string;
  desc?: string;
  icon?: IconeOpcao;
  next: string;
  set: Partial<Answers>;
}

interface CampoForm {
  key: keyof Answers;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'unidade';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

type TipoStep = 'choice' | 'sugestao' | 'form' | 'summary' | 'success' | 'acesso-redirect' | 'para-quem';
type Fase = 'ident' | 'diag' | 'confirm';

interface StepDef {
  type: TipoStep;
  phase: Fase;
  title?: string;
  subtitle?: string;
  sugestaoMotivoDisplay?: string;
  options?: OpcaoStep[];
  fields?: CampoForm[];
  next?: string;
}

function answersIniciais(area?: TipoChamado): Answers {
  return {
    paraOutraPessoa: false,
    colega: null,
    area: area ?? null,
    subcategoria: '',
    categoriaPai: '',
    categoriaFilho: '',
    sistema: '',
    unidade: null,
    local: '',
    abrangencia: '',
    descricao: '',
    urgent: false,
    prioridadeLabel: 'Normal',
    itemManual: null,
  };
}

const STEP_PARA_QUEM = 'para_quem';

const AREA_ENTRY_STEP: Record<TipoChamado, string> = {
  suporte_tecnico: 'diag_suporte_equip',
  telefonia_voip: 'diag_tel_tipo',
  acesso_sistemas: 'diag_acesso_sistema',
  rede_conectividade: 'diag_rede_tipo',
  reparos_infraestrutura: 'diag_infra_tipo',
};

// ─── Árvore de diagnóstico ──────────────────────────────────────────────────

const STEPS: Record<string, StepDef> = {
  [STEP_PARA_QUEM]: {
    type: 'para-quem', phase: 'ident', title: 'Para quem é esse chamado?',
    subtitle: 'Se a pessoa não consegue abrir o chamado sozinha (ex.: está sem internet), abra por ela.',
  },
  inicio: {
    type: 'choice', phase: 'ident', title: 'O que está acontecendo?',
    subtitle: 'Escolha a opção mais parecida com o seu problema.',
    options: [
      { label: 'Computador ou equipamento', desc: 'Computador, monitor, teclado, mouse, impressora etc.', icon: 'monitor', next: 'diag_suporte_equip', set: { area: 'suporte_tecnico' } },
      { label: 'Telefone ou ramal', desc: 'Telefone, ramal, chamadas ou áudio.', icon: 'phone', next: 'diag_tel_tipo', set: { area: 'telefonia_voip' } },
      { label: 'Acesso a um sistema', desc: 'Login, senha, bloqueio ou permissão.', icon: 'key', next: 'diag_acesso_sistema', set: { area: 'acesso_sistemas' } },
      { label: 'Internet ou rede', desc: 'Internet lenta, sem conexão, Wi-Fi, rede cabeada etc.', icon: 'wifi', next: 'diag_rede_tipo', set: { area: 'rede_conectividade' } },
      { label: 'Ambiente físico', desc: 'Ar-condicionado, iluminação, tomada, mobiliário, infiltração etc.', icon: 'wrench', next: 'diag_infra_tipo', set: { area: 'reparos_infraestrutura' } },
      { label: 'Não sei qual é o problema', desc: 'A gente ajuda você a descobrir.', icon: 'help', next: 'diag_incerto_internet', set: { area: null } },
    ],
  },
  diag_suporte_equip: {
    type: 'choice', phase: 'diag', title: 'Qual equipamento está com problema?',
    options: [
      { label: 'Computador', next: 'diag_suporte_liga', set: { subcategoria: 'Computador', categoriaPai: 'Computador' } },
      { label: 'Monitor', next: 'detalhes', set: { subcategoria: 'Monitor', categoriaPai: 'Monitor', categoriaFilho: 'Defeito' } },
      { label: 'Teclado ou mouse', next: 'detalhes', set: { subcategoria: 'Teclado ou mouse', categoriaPai: 'Mouse com defeito', categoriaFilho: '' } },
      { label: 'Impressora', next: 'detalhes', set: { subcategoria: 'Impressora', categoriaPai: 'Impressora', categoriaFilho: 'Defeito' } },
      { label: 'Outro equipamento', next: 'detalhes', set: { subcategoria: 'Outro equipamento' } },
    ],
  },
  diag_suporte_liga: {
    type: 'choice', phase: 'diag', title: 'Ao pressionar o botão, alguma luz acende?',
    options: [
      { label: 'Sim', next: 'detalhes', set: { subcategoria: 'Computador não inicia (com energia)', categoriaPai: 'Computador', categoriaFilho: 'Defeito' } },
      { label: 'Não', next: 'diag_suporte_monitor', set: {} },
    ],
  },
  diag_suporte_monitor: {
    type: 'choice', phase: 'diag', title: 'O monitor também não liga?',
    options: [
      { label: 'Sim, o monitor também está apagado', next: 'diag_suporte_tomada', set: {} },
      { label: 'Não, só o computador', next: 'detalhes', set: { subcategoria: 'Computador não liga', categoriaPai: 'Computador', categoriaFilho: 'Não liga' } },
    ],
  },
  diag_suporte_tomada: {
    type: 'choice', phase: 'diag', title: 'Outros equipamentos ligados na mesma tomada funcionam?',
    options: [
      { label: 'Sim, funcionam normalmente', next: 'detalhes', set: { subcategoria: 'Computador e monitor sem energia', categoriaPai: 'Computador', categoriaFilho: 'Não liga' } },
      { label: 'Não, nada liga nessa tomada', next: 'sugestao_infra', set: {} },
    ],
  },
  sugestao_infra: {
    type: 'sugestao', phase: 'diag', title: 'Isso parece um problema elétrico',
    sugestaoMotivoDisplay: 'Como nenhum equipamento da tomada liga, o mais provável é falta de energia no ponto — e não um defeito do computador.',
    options: [
      { label: 'Encaminhar para Reparos de Infraestrutura', next: 'diag_infra_local', set: { area: 'reparos_infraestrutura', subcategoria: 'Falta de energia no ponto', categoriaPai: '', categoriaFilho: '' } },
      { label: 'Não, manter em Suporte Técnico', next: 'detalhes', set: { subcategoria: 'Computador sem energia', categoriaPai: 'Computador', categoriaFilho: 'Não liga' } },
    ],
  },
  diag_tel_tipo: {
    type: 'choice', phase: 'diag', title: 'Qual é o problema com o telefone?',
    options: [
      { label: 'Sem linha ou sem tom', next: 'detalhes', set: { subcategoria: 'Sem linha / sem tom' } },
      { label: 'Ramal não recebe chamadas', next: 'detalhes', set: { subcategoria: 'Ramal não recebe chamadas' } },
      { label: 'Sem áudio ou áudio ruim', next: 'detalhes', set: { subcategoria: 'Sem áudio / áudio ruim' } },
      { label: 'Outro problema', next: 'detalhes', set: { subcategoria: 'Outro problema de telefonia' } },
    ],
  },
  diag_acesso_sistema: {
    type: 'form', phase: 'diag', title: 'Qual sistema você está tentando acessar?', next: 'diag_acesso_outros_sites',
    fields: [{ key: 'sistema', label: 'Nome do sistema', type: 'text', placeholder: 'ex.: SISAR, SEI, SIMPROC...', required: true }],
  },
  diag_acesso_outros_sites: {
    type: 'choice', phase: 'diag', title: 'Você consegue acessar outros sites normalmente?',
    options: [
      { label: 'Sim', next: 'diag_acesso_outros_sistemas', set: {} },
      { label: 'Não', next: 'sugestao_rede', set: {} },
      { label: 'Não sei', next: 'diag_acesso_outros_sistemas', set: {} },
    ],
  },
  diag_acesso_outros_sistemas: {
    type: 'choice', phase: 'diag', title: 'Outros sistemas internos funcionam normalmente?',
    options: [
      { label: 'Sim', next: 'diag_acesso_mensagem', set: {} },
      { label: 'Não', next: 'sugestao_rede', set: {} },
      { label: 'Não sei', next: 'diag_acesso_mensagem', set: {} },
    ],
  },
  sugestao_rede: {
    type: 'sugestao', phase: 'diag', title: 'Isso parece um problema de rede',
    sugestaoMotivoDisplay: 'Como o problema não é só neste sistema, o mais provável é uma questão de rede ou conectividade.',
    options: [
      { label: 'Encaminhar para Rede e Conectividade', next: 'diag_rede_mesmo_pc', set: { area: 'rede_conectividade' } },
      { label: 'Não, manter em Acesso a Sistemas', next: 'diag_acesso_mensagem', set: {} },
    ],
  },
  diag_acesso_mensagem: {
    type: 'choice', phase: 'diag', title: 'Qual mensagem aparece na tela?',
    options: [
      { label: 'Usuário ou senha incorretos', next: 'acesso_redirect', set: { subcategoria: 'Usuário ou senha incorretos' } },
      { label: 'Sem permissão / acesso bloqueado', next: 'acesso_redirect', set: { subcategoria: 'Sem permissão / acesso bloqueado' } },
      { label: 'Erro do sistema', next: 'acesso_redirect', set: { subcategoria: 'Erro do sistema' } },
      { label: 'Nenhuma mensagem / outro', next: 'acesso_redirect', set: { subcategoria: 'A classificar' } },
    ],
  },
  diag_rede_tipo: {
    type: 'choice', phase: 'diag', title: 'Como está o problema de conexão?',
    options: [
      { label: 'Sem internet', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Sem internet', categoriaPai: 'Rede', categoriaFilho: 'Sem internet' } },
      { label: 'Internet lenta', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Internet lenta', categoriaPai: 'Internet lenta', categoriaFilho: '' } },
      { label: 'Não consigo acessar um site', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Não acessa site externo', categoriaPai: 'Rede', categoriaFilho: 'Sem internet' } },
      { label: 'Não consigo acessar um sistema interno', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Não acessa sistema interno', categoriaPai: 'Rede', categoriaFilho: 'Sem internet' } },
      { label: 'Não consigo conectar ao Wi-Fi', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Falha ao conectar no Wi-Fi', categoriaPai: 'Rede', categoriaFilho: 'Sem internet' } },
      { label: 'Problema na rede cabeada', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Problema na rede cabeada' } },
      { label: 'VPN / acesso remoto', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Falha em VPN / acesso remoto' } },
      { label: 'Outro', next: 'diag_rede_mesmo_pc', set: { subcategoria: 'Outro problema de rede' } },
    ],
  },
  diag_rede_mesmo_pc: {
    type: 'choice', phase: 'diag', title: 'O problema acontece somente no seu computador?',
    options: [
      { label: 'Sim, só no meu', next: 'detalhes', set: {} },
      { label: 'Não, em mais de um lugar', next: 'diag_rede_outros', set: {} },
      { label: 'Não sei', next: 'diag_rede_outros', set: {} },
    ],
  },
  diag_rede_outros: {
    type: 'choice', phase: 'diag', title: 'Outras pessoas próximas estão com o mesmo problema?',
    options: [
      { label: 'Sim', next: 'detalhes', set: { abrangencia: 'Mais de uma pessoa', prioridadeLabel: 'Alta' } },
      { label: 'Não', next: 'detalhes', set: { abrangencia: 'Somente eu' } },
    ],
  },
  diag_infra_tipo: {
    type: 'choice', phase: 'diag', title: 'O que precisa de manutenção?',
    options: [
      { label: 'Iluminação', next: 'diag_infra_risco', set: { subcategoria: 'Iluminação' } },
      { label: 'Ar-condicionado', next: 'diag_infra_risco', set: { subcategoria: 'Ar-condicionado' } },
      { label: 'Tomada / energia', next: 'diag_infra_risco', set: { subcategoria: 'Tomada / energia' } },
      { label: 'Hidráulica / vazamento', next: 'diag_infra_risco', set: { subcategoria: 'Hidráulica / vazamento' } },
      { label: 'Porta / fechadura', next: 'diag_infra_risco', set: { subcategoria: 'Porta / fechadura' } },
      { label: 'Mobiliário', next: 'diag_infra_risco', set: { subcategoria: 'Mobiliário' } },
      { label: 'Parede / teto / piso', next: 'diag_infra_risco', set: { subcategoria: 'Parede / teto / piso' } },
      { label: 'Elevador', next: 'diag_infra_risco', set: { subcategoria: 'Elevador' } },
      { label: 'Limpeza', next: 'diag_infra_risco', set: { subcategoria: 'Limpeza' } },
      { label: 'Dedetização / pragas', next: 'diag_infra_risco', set: { subcategoria: 'Dedetização / pragas' } },
      { label: 'Outro', next: 'diag_infra_risco', set: { subcategoria: 'Outro' } },
    ],
  },
  diag_infra_risco: {
    type: 'choice', phase: 'diag', title: 'Existe algum risco imediato para pessoas ou patrimônio?',
    options: [
      { label: 'Sim, há risco imediato', next: 'diag_infra_local', set: { urgent: true, prioridadeLabel: 'Máxima' } },
      { label: 'Não', next: 'diag_infra_local', set: {} },
    ],
  },
  diag_infra_local: {
    type: 'form', phase: 'diag', title: 'Onde está o problema?', next: 'detalhes',
    fields: [
      { key: 'unidade', label: 'Unidade', type: 'unidade', required: true },
      { key: 'local', label: 'Prédio, andar e sala (opcional)', type: 'text', placeholder: 'ex.: Edifício Martinelli, 8º andar' },
    ],
  },
  diag_incerto_internet: {
    type: 'choice', phase: 'diag', title: 'Você consegue acessar a internet normalmente?',
    options: [
      { label: 'Sim', next: 'diag_incerto_sistema', set: {} },
      { label: 'Não', next: 'diag_incerto_outros_sem_net', set: { area: 'rede_conectividade', subcategoria: 'Sem internet', categoriaPai: 'Rede', categoriaFilho: 'Sem internet' } },
    ],
  },
  diag_incerto_outros_sem_net: {
    type: 'choice', phase: 'diag', title: 'Outras pessoas também estão sem acesso?',
    options: [
      { label: 'Sim', next: 'detalhes', set: { abrangencia: 'Mais de uma pessoa', prioridadeLabel: 'Alta' } },
      { label: 'Não', next: 'detalhes', set: {} },
      { label: 'Não sei', next: 'detalhes', set: {} },
    ],
  },
  diag_incerto_sistema: {
    type: 'choice', phase: 'diag', title: 'O problema é para acessar um sistema específico?',
    options: [
      { label: 'Sim', next: 'diag_acesso_mensagem', set: { area: 'acesso_sistemas' } },
      { label: 'Não', next: 'diag_incerto_tipo', set: {} },
    ],
  },
  diag_incerto_tipo: {
    type: 'choice', phase: 'diag', title: 'É um problema com computador, telefone ou ambiente físico?',
    options: [
      { label: 'Computador ou equipamento', next: 'diag_suporte_equip', set: { area: 'suporte_tecnico' } },
      { label: 'Telefone ou ramal', next: 'diag_tel_tipo', set: { area: 'telefonia_voip' } },
      { label: 'Ambiente físico', next: 'diag_infra_tipo', set: { area: 'reparos_infraestrutura' } },
      { label: 'Nenhum desses / prefiro descrever', next: 'detalhes', set: { area: 'suporte_tecnico', subcategoria: 'A classificar' } },
    ],
  },
  urgente_tipo: {
    type: 'choice', phase: 'diag', title: 'Qual é a natureza da emergência?', subtitle: 'Isso será encaminhado com prioridade máxima.',
    options: [
      { label: 'Vazamento de água', next: 'urgente_local', set: { area: 'reparos_infraestrutura', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Vazamento de água' } },
      { label: 'Curto-circuito / risco elétrico', next: 'urgente_local', set: { area: 'reparos_infraestrutura', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Curto-circuito / risco elétrico' } },
      { label: 'Cheiro de queimado', next: 'urgente_local', set: { area: 'reparos_infraestrutura', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Cheiro de queimado' } },
      { label: 'Princípio de incêndio', next: 'urgente_local', set: { area: 'reparos_infraestrutura', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Princípio de incêndio' } },
      { label: 'Equipamento oferecendo risco', next: 'urgente_local', set: { area: 'suporte_tecnico', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Equipamento oferecendo risco' } },
      { label: 'Porta ou estrutura em situação perigosa', next: 'urgente_local', set: { area: 'reparos_infraestrutura', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Estrutura em situação perigosa' } },
      { label: 'Outro risco imediato', next: 'urgente_local', set: { area: 'reparos_infraestrutura', urgent: true, prioridadeLabel: 'Máxima', subcategoria: 'Outro risco imediato' } },
    ],
  },
  urgente_local: {
    type: 'form', phase: 'diag', title: 'Onde está acontecendo e o que você observa?', next: 'resumo',
    fields: [
      { key: 'unidade', label: 'Unidade', type: 'unidade', required: true },
      { key: 'local', label: 'Prédio, andar e sala (opcional)', type: 'text', placeholder: 'ex.: Edifício Martinelli, 8º andar' },
      { key: 'descricao', label: 'Descreva rapidamente a situação', type: 'textarea', placeholder: 'O que está acontecendo agora, o que já foi feito...', required: true },
    ],
  },
};

function getDetalhesFields(answers: Answers): CampoForm[] {
  const fields: CampoForm[] = [];
  if (!answers.unidade) fields.push({ key: 'unidade', label: 'Unidade', type: 'unidade', required: true });
  if (!answers.local) fields.push({ key: 'local', label: 'Prédio, andar e sala (opcional)', type: 'text', placeholder: 'ex.: Edifício Martinelli, 8º andar' });
  if (!answers.abrangencia) fields.push({ key: 'abrangencia', label: 'Isso afeta mais alguém além de você?', type: 'select', options: ['Somente eu', 'Mais de uma pessoa', 'Não sei'] });
  fields.push({ key: 'descricao', label: 'Descreva o que está acontecendo', type: 'textarea', placeholder: 'Conte com suas palavras o que percebeu...', required: true });
  return fields;
}

function getStep(stepId: string, answers: Answers): StepDef {
  if (stepId === 'detalhes') return { type: 'form', phase: 'diag', title: 'Só mais alguns detalhes', next: 'resumo', fields: getDetalhesFields(answers) };
  if (stepId === 'resumo') return { type: 'summary', phase: 'confirm', title: 'Confira as informações' };
  if (stepId === 'confirmado') return { type: 'success', phase: 'confirm' };
  if (stepId === 'acesso_redirect') {
    return {
      type: 'acesso-redirect', phase: 'confirm', title: 'Isso é uma solicitação de acesso',
      sugestaoMotivoDisplay: 'Solicitações de acesso a sistemas seguem um fluxo próprio, com aprovação do responsável pela sua unidade.',
    };
  }
  return STEPS[stepId] ?? STEPS.inicio;
}

function isFieldEmpty(f: CampoForm, answers: Answers): boolean {
  if (f.type === 'unidade') return !answers.unidade;
  const v = answers[f.key];
  return !String(v ?? '').trim();
}

function gerarResumo(a: Answers): string {
  const partes: string[] = [];
  const sub = a.subcategoria || 'o problema relatado';
  partes.push(`Usuário relata: ${sub}${a.sistema ? ' no sistema ' + a.sistema : ''}.`);
  const localTxt = [a.unidade?.full, a.local.trim()].filter(Boolean).join(' — ');
  if (localTxt) partes.push(`Local: ${localTxt}.`);
  if (a.abrangencia === 'Mais de uma pessoa') partes.push('Outras pessoas do mesmo local também são afetadas.');
  if (a.urgent) partes.push('Classificado como risco imediato — necessita atendimento prioritário.');
  if (a.descricao.trim()) partes.push(`Relato do usuário: "${a.descricao.trim()}"`);
  return partes.join(' ');
}

function gerarTitulo(a: Answers, areaLabel: string): string {
  if (a.subcategoria) return a.subcategoria;
  return `Chamado — ${areaLabel}`;
}

const PRIORIDADE_MAP: Record<PrioridadeLabel, Prioridade> = {
  Normal: 'media',
  Alta: 'alta',
  Máxima: 'urgente',
};

const FALLBACK_CATEGORIA_PAI: Partial<Record<TipoChamado, string>> = {
  reparos_infraestrutura: 'Infraestrutura Predial',
};

function resolverCategoriaId(
  categorias: Categoria[],
  categoriasPai: string[],
  tipoArea: TipoChamado,
  pai: string,
  filho: string,
): number | null {
  if (pai) {
    const exato = resolveCategoriaId(categorias, pai, filho);
    if (exato) return exato;
  }
  const preferida = FALLBACK_CATEGORIA_PAI[tipoArea];
  if (preferida) {
    const viaPreferida = resolveCategoriaId(categorias, preferida, '');
    if (viaPreferida) return viaPreferida;
  }
  const compativeis = categoriasPai.filter((p) => categoriaCompativelComArea(categorias, p, tipoArea));
  const pool = compativeis.length > 0 ? compativeis : categoriasPai;
  for (const p of pool) {
    const id = resolveCategoriaId(categorias, p, '') ?? categorias.find((c) => c.pai === p)?.id;
    if (id) return id;
  }
  return categorias[0]?.id ?? null;
}

// ─── Ícones ─────────────────────────────────────────────────────────────────

function Icone({ nome }: { nome: IconeOpcao }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (nome) {
    case 'monitor':
      return <svg {...common}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
    case 'phone':
      return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.36 1.89.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.92.34 1.86.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
    case 'key':
      return <svg {...common}><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></svg>;
    case 'wifi':
      return <svg {...common}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" /></svg>;
    case 'wrench':
      return <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
    case 'help':
      return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface WizardProps {
  navTo: (v: 'novo-chamado' | 'chamados' | 'chamado-detalhe', id?: number) => void;
  setChamados: React.Dispatch<React.SetStateAction<Chamado[]>>;
  usuarios: Usuario[];
  usuarioPorId: (id: number) => Usuario | null;
  usuarioLogadoId: number | null;
  unidades: Unidade[];
  categorias: Categoria[];
  categoriasPai: string[];
  itensPatrimonio: ItemPatrimonio[];
  areaFiltro?: TipoChamado;
}

function isTipoComputadorLocal(tipo: string | null | undefined): boolean {
  return (tipo ?? '').trim().toLowerCase() === 'computador';
}

export function ViewNovoChamadoAssistente({
  navTo, setChamados, usuarios, usuarioPorId, usuarioLogadoId, unidades, categorias, categoriasPai, itensPatrimonio, areaFiltro,
}: WizardProps) {
  const router = useRouter();
  /** Depois de dizer para quem é o chamado, segue para o diagnóstico (ou direto pra área, se veio filtrado). */
  const proximaAposIdentificacao = areaFiltro ? AREA_ENTRY_STEP[areaFiltro] : 'inicio';
  const entryStepId = STEP_PARA_QUEM;

  const [stepId, setStepId] = useState(entryStepId);
  const [history, setHistory] = useState<{ stepId: string; answers: Answers }[]>([]);
  const [answers, setAnswers] = useState<Answers>(answersIniciais(areaFiltro));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [chamadoCriado, setChamadoCriado] = useState<Chamado | null>(null);

  const usuarioLogado = usuarioLogadoId ? usuarioPorId(usuarioLogadoId) : null;
  const solicitanteEfetivo = answers.paraOutraPessoa ? answers.colega : usuarioLogado;

  const step = getStep(stepId, answers);
  const tipoArea = answers.area ?? undefined;
  const areaDiagnostico = tipoArea ?? 'suporte_tecnico';

  const categoriaResolvidaId = useMemo(
    () => resolverCategoriaId(categorias, categoriasPai, areaDiagnostico, answers.categoriaPai, answers.categoriaFilho),
    [categorias, categoriasPai, areaDiagnostico, answers.categoriaPai, answers.categoriaFilho],
  );
  const categoriaResolvida = useMemo(
    () => categorias.find((c) => c.id === categoriaResolvidaId) ?? null,
    [categorias, categoriaResolvidaId],
  );
  /** Setor final de atendimento: o setor configurado na categoria (tela de configuração) manda;
   * o percurso do diagnóstico é só o palpite inicial usado até a categoria ser resolvida. */
  const areaFinal: TipoChamado = categoriaResolvida?.area ?? areaDiagnostico;
  const areaMeta = TIPO_CHAMADO_META[areaFinal];

  const computadorAuto = useMemo(() => {
    if (areaFinal !== 'suporte_tecnico' || !solicitanteEfetivo) return null;
    return itensPatrimonio.find(
      (i) => isTipoComputadorLocal(i.tipo) && i.servidorId === solicitanteEfetivo.id && normalizarStatusItem(i.statusitem) === 'Ativo',
    ) ?? null;
  }, [areaFinal, solicitanteEfetivo, itensPatrimonio]);

  const computadoresParaEscolha = useMemo(
    () => itensPatrimonio.filter((i) => isTipoComputadorLocal(i.tipo) && normalizarStatusItem(i.statusitem) === 'Ativo'),
    [itensPatrimonio],
  );

  const [detalhesFieldsFixas, setDetalhesFieldsFixas] = useState<CampoForm[]>([]);
  useEffect(() => {
    if (stepId === 'detalhes') {
      setDetalhesFieldsFixas(getDetalhesFields(answers));
    }
    // Os campos de "detalhes" são fixados ao entrar no passo: recalculá-los a cada
    // resposta faria o campo (ex.: Unidade) sumir da tela assim que fosse preenchido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  function pushHistoryAndGo(nextId: string, setObj: Partial<Answers>) {
    setHistory((h) => [...h, { stepId, answers }]);
    setAnswers((a) => ({ ...a, ...setObj }));
    setStepId(nextId);
  }

  function selectOption(opt: OpcaoStep) {
    pushHistoryAndGo(opt.next, opt.set);
  }

  function goBack() {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setAnswers(prev.answers);
      setStepId(prev.stepId);
      return h.slice(0, -1);
    });
  }

  function goUrgent() {
    pushHistoryAndGo('urgente_tipo', {});
  }

  function updateField<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function resetAll() {
    setHistory([]);
    setAnswers(answersIniciais(areaFiltro));
    setStepId(entryStepId);
    setErro(null);
    setChamadoCriado(null);
  }

  async function openTicket() {
    if (!usuarioLogadoId || !usuarioLogado) {
      setErro('Não foi possível identificar o usuário logado');
      return;
    }
    if (answers.paraOutraPessoa && !answers.colega) {
      setErro('Selecione para quem é o chamado');
      return;
    }
    if (!answers.unidade) {
      setErro('Selecione a unidade');
      return;
    }
    const itemEscolhido = computadorAuto ?? answers.itemManual;
    const exigeItem = exigeComputadorNaAbertura(areaFinal);
    if (exigeItem && !itemEscolhido) {
      setErro('Selecione o computador do chamado');
      return;
    }

    const prioridade = answers.urgent ? 'urgente' : PRIORIDADE_MAP[answers.prioridadeLabel];
    const solicitante = solicitanteEfetivo ?? usuarioLogado;

    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch('/api/helpdesk/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: gerarTitulo(answers, areaMeta.label),
          descricao: gerarResumo(answers),
          unidadeId: answers.unidade.id,
          categoriaId: categoriaResolvidaId,
          prioridade,
          solicitanteId: solicitante.id,
          abertoEmNomeDeId: answers.paraOutraPessoa ? usuarioLogadoId : null,
          telefone: solicitante.telefone || undefined,
          itemId: itemEscolhido?.idbem ?? null,
          areaAtual: areaFinal,
          observadorIds: answers.paraOutraPessoa ? [usuarioLogadoId] : [],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      setChamados((prev) => [data.chamado, ...prev]);
      setChamadoCriado(data.chamado);
      pushHistoryAndGo('confirmado', {});
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  }

  const isChoice = step.type === 'choice';
  const isSugestao = step.type === 'sugestao';
  const isForm = step.type === 'form';
  const isSummary = step.type === 'summary';
  const isSuccess = step.type === 'success';
  const isAcessoRedirect = step.type === 'acesso-redirect';
  const isParaQuem = step.type === 'para-quem';

  const canGoBack = history.length > 0 && !isSuccess;
  const showUrgentBanner = !isSuccess && !isSummary && !isAcessoRedirect && !isParaQuem && stepId !== 'urgente_tipo' && stepId !== 'urgente_local';
  const showPhases = !isSuccess;

  const phaseDefs: Array<{ key: Fase; label: string }> = [
    { key: 'ident', label: 'Identificação' },
    { key: 'diag', label: 'Diagnóstico' },
    { key: 'confirm', label: 'Confirmação' },
  ];
  const currentPhaseIdx = Math.max(0, phaseDefs.findIndex((p) => p.key === step.phase));

  const fields = isForm ? (stepId === 'detalhes' ? detalhesFieldsFixas : (step.fields ?? [])) : [];
  const formDisabled = isForm && fields.some((f) => f.required && isFieldEmpty(f, answers));

  const prioridadeFinal: PrioridadeLabel = answers.urgent ? 'Máxima' : answers.prioridadeLabel;
  const prioridadeBg = prioridadeFinal === 'Máxima' ? '#FBDADA' : prioridadeFinal === 'Alta' ? '#FCE5D0' : '#F1F1F4';
  const prioridadeColor = prioridadeFinal === 'Máxima' ? '#7A1F1F' : prioridadeFinal === 'Alta' ? '#7A3A0B' : '#52525B';

  if (!usuarioLogado) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 13, color: '#71717a' }}>
          {usuarioLogadoId === null ? 'Carregando seus dados...' : 'Usuário logado não encontrado na base do helpdesk.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 16px 80px', maxWidth: 720, margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#71717a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={() => navTo('chamados')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#71717a', cursor: 'pointer' }}>Chamados</button>
            <span>›</span>
            <span style={{ color: '#18181b', fontWeight: 500 }}>Novo chamado</span>
          </div>
          <button type="button" onClick={() => navTo('novo-chamado')} title="Uso interno da equipe técnica de suporte"
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#71717a', textDecoration: 'underline dotted', textUnderlineOffset: 3, cursor: 'pointer' }}>
            Sou técnico, abrir chamado direto
          </button>
        </div>

        {!isSuccess && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#18181b', margin: '0 0 6px', letterSpacing: '-0.01em' }}>Abrir chamado</h1>
            <p style={{ fontSize: 14, color: '#52525b', margin: 0 }}>Responda algumas perguntas rápidas. A gente descobre pra qual área encaminhar.</p>
          </div>
        )}

        {showUrgentBanner && (
          <button type="button" onClick={goUrgent} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', border: '1px solid #f3c6c1', background: '#FBDADA', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', width: '100%' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#7A1F1F' }}>Risco imediato para pessoas ou patrimônio?</div>
              <div style={{ fontSize: 12.5, color: '#7A1F1F', opacity: 0.85 }}>Vazamento, curto-circuito, princípio de incêndio, etc. — reporte com prioridade máxima.</div>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#7A1F1F', whiteSpace: 'nowrap' }}>Reportar →</span>
          </button>
        )}

        {showPhases && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {phaseDefs.map((ph, i) => (
              <div key={ph.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: i <= currentPhaseIdx ? '#0A328D' : '#E4E4E7',
                  color: i <= currentPhaseIdx ? '#FFFFFF' : '#71717A',
                }}>{i + 1}</div>
                <span style={{ fontSize: 12.5, color: i === currentPhaseIdx ? '#18181B' : '#71717A', fontWeight: i === currentPhaseIdx ? 600 : 400 }}>{ph.label}</span>
                {i < phaseDefs.length - 1 && <div style={{ width: 20, height: 1, background: '#d4d4d8' }} />}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 14, padding: 28, boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>

          {canGoBack && (
            <button type="button" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71717a', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              Voltar
            </button>
          )}

          {erro && (
            <div style={{ background: '#FBDADA', border: '1px solid #F5AAAA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#7A1F1F' }}>
              {erro}
            </div>
          )}

          {isParaQuem && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#18181b', margin: 0 }}>{step.title}</h2>
              {step.subtitle && <p style={{ fontSize: 13.5, color: '#71717a', margin: '6px 0 0' }}>{step.subtitle}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                {[
                  { v: false, label: 'Para mim' },
                  { v: true, label: 'Para outra pessoa' },
                ].map((opt) => (
                  <button key={String(opt.v)} type="button"
                    onClick={() => updateField('paraOutraPessoa', opt.v)}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                      border: `2px solid ${answers.paraOutraPessoa === opt.v ? '#0A328D' : '#e4e4e7'}`,
                      background: answers.paraOutraPessoa === opt.v ? '#D9E1F4' : '#fff',
                      color: answers.paraOutraPessoa === opt.v ? '#0A328D' : '#3f3f46',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {answers.paraOutraPessoa && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3f3f46', marginBottom: 6 }}>Quem precisa de ajuda?</label>
                  <AutocompleteInput
                    value={answers.colega}
                    onChange={(u) => updateField('colega', u)}
                    items={usuarios.filter((u) => u.id !== usuarioLogadoId && u.statususer === 'Ativo')}
                    getLabel={(u) => u.nome}
                    getKey={(u) => u.id}
                    placeholder="Digite o nome da pessoa..."
                  />
                  <div style={{ fontSize: 11.5, color: '#7A8499', marginTop: 6 }}>
                    Você ficará como observador deste chamado para acompanhar o andamento.
                  </div>
                </div>
              )}
              <button type="button"
                onClick={() => pushHistoryAndGo(proximaAposIdentificacao, {})}
                disabled={answers.paraOutraPessoa && !answers.colega}
                style={{
                  marginTop: 22, padding: '11px 22px', borderRadius: 8, border: 'none', background: '#0A328D', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: (answers.paraOutraPessoa && !answers.colega) ? 'not-allowed' : 'pointer',
                  opacity: (answers.paraOutraPessoa && !answers.colega) ? 0.6 : 1,
                }}>
                Continuar
              </button>
            </>
          )}

          {isChoice && step.options && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#18181b', margin: 0 }}>{step.title}</h2>
              {step.subtitle && <p style={{ fontSize: 13.5, color: '#71717a', margin: '6px 0 0' }}>{step.subtitle}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                {step.options.map((opt) => (
                  <button key={opt.label} type="button" onClick={() => selectOption(opt)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', border: '1px solid #e4e4e7', background: '#fff', borderRadius: 10, padding: '14px 16px', cursor: 'pointer' }}>
                    {opt.icon && (
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: '#EEF1FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#0A328D' }}>
                        <Icone nome={opt.icon} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#18181b' }}>{opt.label}</div>
                      {opt.desc && <div style={{ fontSize: 12.5, color: '#71717a', marginTop: 2 }}>{opt.desc}</div>}
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                ))}
              </div>
            </>
          )}

          {isSugestao && step.options && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#18181b', margin: 0 }}>{step.title}</h2>
              <p style={{ fontSize: 13.5, color: '#52525b', margin: '8px 0 0', background: '#F4F5F9', borderRadius: 8, padding: '12px 14px' }}>{step.sugestaoMotivoDisplay}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                {step.options.map((opt) => (
                  <button key={opt.label} type="button" onClick={() => selectOption(opt)}
                    style={{ textAlign: 'left', border: '1px solid #e4e4e7', background: '#fff', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', fontSize: 14.5, fontWeight: 600, color: '#18181b' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {isAcessoRedirect && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: '#EEE2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B3E91', marginBottom: 16 }}>
                <Icone nome="key" />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#18181b', margin: '0 0 6px' }}>{step.title}</h2>
              <p style={{ fontSize: 13.5, color: '#71717a', margin: '0 0 18px', maxWidth: 420 }}>{step.sugestaoMotivoDisplay}</p>
              <button type="button" onClick={() => router.push('/helpdesk/chamados/acesso-sistemas/novo')}
                style={{ padding: '11px 22px', borderRadius: 8, border: 'none', background: '#0A328D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Continuar para solicitação de acesso
              </button>
            </div>
          )}

          {isForm && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#18181b', margin: '0 0 18px' }}>{step.title}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fields.map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3f3f46', marginBottom: 6 }}>{f.label}</label>
                    {f.type === 'text' && (
                      <input value={String(answers[f.key] ?? '')} onChange={(e) => updateField(f.key, e.target.value as never)} placeholder={f.placeholder}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 14, color: '#18181b', background: '#fff' }} />
                    )}
                    {f.type === 'textarea' && (
                      <textarea value={String(answers[f.key] ?? '')} onChange={(e) => updateField(f.key, e.target.value as never)} placeholder={f.placeholder} rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 14, color: '#18181b', background: '#fff', resize: 'vertical', fontFamily: 'inherit' }} />
                    )}
                    {f.type === 'select' && (
                      <select value={String(answers[f.key] ?? '')} onChange={(e) => updateField(f.key, e.target.value as never)}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 14, color: '#18181b', background: '#fff' }}>
                        <option value="">Selecione...</option>
                        {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {f.type === 'unidade' && (
                      <AutocompleteInput
                        value={answers.unidade}
                        onChange={(u) => updateField('unidade', u)}
                        items={unidades}
                        getLabel={(u) => u.full}
                        getKey={(u) => u.id}
                        placeholder="Digite para buscar a unidade..."
                      />
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => step.next && pushHistoryAndGo(step.next, {})} disabled={formDisabled}
                style={{ marginTop: 22, padding: '11px 22px', borderRadius: 8, border: 'none', background: '#0A328D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: formDisabled ? 'not-allowed' : 'pointer', opacity: formDisabled ? 0.6 : 1 }}>
                Continuar
              </button>
            </>
          )}

          {isSummary && areaMeta && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#18181b', margin: '0 0 18px' }}>Confira as informações</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <LinhaResumo label="Área responsável">
                  <span style={{ fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: areaMeta.corBg, color: areaMeta.corText }}>{areaMeta.label}</span>
                </LinhaResumo>
                {answers.paraOutraPessoa && (
                  <LinhaResumo label="Solicitante">
                    <span style={{ fontSize: 13.5, color: '#18181b', fontWeight: 500 }}>{answers.colega?.nome ?? 'Não selecionado'}</span>
                  </LinhaResumo>
                )}
                <LinhaResumo label="Categoria">
                  <span style={{ fontSize: 13.5, color: '#18181b', fontWeight: 500 }}>{answers.subcategoria || 'Não especificado'}</span>
                </LinhaResumo>
                <LinhaResumo label="Local">
                  <span style={{ fontSize: 13.5, color: '#18181b', fontWeight: 500 }}>{[answers.unidade?.full, answers.local].filter(Boolean).join(' — ') || 'Não informado'}</span>
                </LinhaResumo>
                <LinhaResumo label="Abrangência">
                  <span style={{ fontSize: 13.5, color: '#18181b', fontWeight: 500 }}>{answers.abrangencia || 'Somente eu'}</span>
                </LinhaResumo>
                <LinhaResumo label="Prioridade" ultima>
                  <span style={{ fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: prioridadeBg, color: prioridadeColor }}>{prioridadeFinal}</span>
                </LinhaResumo>
              </div>
              <div style={{ marginTop: 6, background: '#F4F5F9', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Resumo</div>
                <p style={{ fontSize: 13.5, color: '#3f3f46', margin: 0, lineHeight: 1.5 }}>{gerarResumo(answers)}</p>
              </div>
              {areaFinal === 'suporte_tecnico' && !computadorAuto && (
                <div style={{ marginTop: 12, background: '#FCE5D0', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12.5, color: '#7A3A0B', marginBottom: 8 }}>
                    Não encontramos automaticamente um computador vinculado a {answers.paraOutraPessoa ? (answers.colega?.nome ?? 'essa pessoa') : 'você'}. Selecione o equipamento abaixo.
                  </div>
                  <AutocompleteInput
                    value={answers.itemManual}
                    onChange={(it) => updateField('itemManual', it)}
                    items={computadoresParaEscolha}
                    getLabel={(it) => `${it.patrimonio} — ${it.descsbpm}`}
                    getKey={(it) => it.idbem}
                    placeholder="Busque por patrimônio, descrição ou modelo do computador..."
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={resetAll} style={{ flex: 1, padding: '11px 18px', borderRadius: 8, border: '1px solid #e4e4e7', background: '#fff', color: '#3f3f46', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Recomeçar</button>
                {(() => {
                  const faltaComputador = areaFinal === 'suporte_tecnico' && !computadorAuto && !answers.itemManual;
                  const abrirDesabilitado = salvando || faltaComputador;
                  return (
                    <button type="button" onClick={openTicket} disabled={abrirDesabilitado}
                      style={{ flex: 2, padding: '11px 18px', borderRadius: 8, border: 'none', background: '#0A328D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: abrirDesabilitado ? 'not-allowed' : 'pointer', opacity: abrirDesabilitado ? 0.6 : 1 }}>
                      {salvando ? 'Abrindo...' : 'Abrir chamado'}
                    </button>
                  );
                })()}
              </div>
            </>
          )}

          {isSuccess && areaMeta && chamadoCriado && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: '#DCEEE3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E7A46', marginBottom: 16 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m22 4-10 10-3-3" /></svg>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#18181b', margin: '0 0 6px' }}>Chamado aberto com sucesso</h2>
              <p style={{ fontSize: 13.5, color: '#71717a', margin: '0 0 18px' }}>A equipe responsável vai assumir o atendimento em breve.</p>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 15, fontWeight: 600, color: '#18181b', background: '#F4F5F9', borderRadius: 8, padding: '8px 16px', marginBottom: 10 }}>#{chamadoCriado.id}</div>
              <span style={{ fontSize: 12.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: areaMeta.corBg, color: areaMeta.corText, marginBottom: 22 }}>{areaMeta.label}</span>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={resetAll} style={{ padding: '11px 22px', borderRadius: 8, border: '1px solid #e4e4e7', background: '#fff', color: '#3f3f46', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Abrir outro chamado
                </button>
                <button type="button" onClick={() => navTo('chamado-detalhe', chamadoCriado.id)} style={{ padding: '11px 22px', borderRadius: 8, border: 'none', background: '#0A328D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Ver chamado
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function LinhaResumo({ label, children, ultima }: { label: string; children: ReactNode; ultima?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: ultima ? 'none' : '1px solid #f1f1f4' }}>
      <span style={{ fontSize: 13, color: '#71717a' }}>{label}</span>
      {children}
    </div>
  );
}
