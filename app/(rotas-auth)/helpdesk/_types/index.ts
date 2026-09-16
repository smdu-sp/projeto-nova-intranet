export type {
  TipoChamado,
} from '@/lib/helpdesk/tipos-chamado';
export {
  TIPOS_CHAMADO,
  TIPO_CHAMADO_META,
  labelTipoChamado,
  rotaChamadosArea,
  exigeComputadorNaAbertura,
} from '@/lib/helpdesk/tipos-chamado';

export type StatusChamado = 'aberto' | 'atendimento' | 'aguardando' | 'aguardando_autorizacao' | 'prodam' | 'resolvido' | 'fechado';
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente';
export type TipoEvento = 'abertura' | 'atribuicao' | 'resolucao' | 'fechamento' | 'reabertura' | 'statusAlterado' | 'encaminhamento';
export type PapelUsuario = 'solicitante' | 'observador' | 'tecnico' | 'participante';
export type TipoMensagem = 'publica' | 'interna' | 'solucao';

export interface Unidade {
  id: string;
  full: string;
  raiz: string;
  sigla: string;
  codigo: string;
  /** Sala física da equipe (cadastro da unidade) */
  sala?: string;
}

export interface Categoria {
  id: number;
  nome: string;
  full: string;
  pai: string;
  filho: string | null;
  /** Setor para o qual chamados dessa categoria são enviados na abertura */
  area: import('@/lib/helpdesk/tipos-chamado').TipoChamado | null;
}

export interface Usuario {
  id: number;
  usuario: string;
  nome: string;
  permissao: number;
  perfil: 'ADM' | 'TEC' | 'USR';
  email: string;
  telefone?: string;
  statususer: 'Ativo' | 'Inativo';
}

export interface ChamadoEvento {
  tipo: TipoEvento;
  autor: number;
  data: string;
  texto: string;
}

export interface Anexo {
  id: number;
  nomeArquivo: string;
  urlArquivo: string;
  tipoMime: string;
  tamanho: number;
}

export interface Mensagem {
  id: number;
  autor: number;
  data: string;
  texto: string;
  tipo: TipoMensagem;
  anexos?: Anexo[];
}

export interface SolicitacaoAcessoChamado {
  id: number;
  nomeBeneficiario: string;
  rfBeneficiario: string;
  sistema: string;
  sistemaId: number;
  permissao: string;
  permissaoId: number;
  unidade: string;
  coordenadoria: string | null;
  observacao?: string;
  paraSiMesmo: boolean;
  statusAutorizacao: 'aguardando' | 'negado' | 'autorizado';
  responsavelAutorizacao?: number;
  responsavelAutorizacaoNome?: string;
  motivoNegacao?: string;
  dataAutorizacao?: string;
}

export interface EncaminhamentoChamado {
  id: number;
  areaDe: import('@/lib/helpdesk/tipos-chamado').TipoChamado;
  areaPara: import('@/lib/helpdesk/tipos-chamado').TipoChamado;
  motivo: string;
  autor: number;
  data: string;
}

export interface Chamado {
  id: number;
  titulo: string;
  categoria: string;
  areaOrigem: import('@/lib/helpdesk/tipos-chamado').TipoChamado;
  areaAtual: import('@/lib/helpdesk/tipos-chamado').TipoChamado;
  encaminhamentos: EncaminhamentoChamado[];
  solicitacaoAcesso?: SolicitacaoAcessoChamado;
  status: StatusChamado;
  prioridade: Prioridade;
  solicitante: number;
  abertoEmNomeDe?: number;
  telefone?: string;
  tecnicos: number[];
  observadores: number[];
  unidade: string;
  item: number | null;
  abertura: string;
  dataResolucao?: string;
  dataFechamento?: string;
  prazoConfirmacao?: string;
  avaliacao?: number;
  descricao: string;
  resolucao?: string;
  eventos: ChamadoEvento[];
  mensagens: Mensagem[];
}

export interface ItemPatrimonio {
  idbem: number;
  patrimonio: string;
  tipo: string;
  descsbpm: string;
  numserie: string;
  marca: string;
  modelo: string;
  localizacao: string;
  unidadeId?: string | null;
  servidor: string;
  servidorId: number | null;
  cimbpm: string;
  /** Nome do computador na rede */
  nomeRede?: string;
  statusitem: string;
}

export interface TransferenciaItem {
  id: number;
  idItem: number;
  patrimonio?: string;
  descricao?: string;
  servidorAnterior: string;
  servidorAtual: string;
}

export interface Transferencia {
  id: number;
  dataTransferencia: string;
  idUsuarioRegistro: number;
  idUnidadeDestino: string;
  unidadeDestino: string;
  cimbpm: string;
  observacao: string;
  itens: TransferenciaItem[];
}

export interface BaixaPatrimonio {
  id: number;
  idItem: number;
  patrimonio: string;
  descricao: string;
  dataBaixa: string;
  idUsuarioBaixa: number;
  usuarioBaixa: string;
  documentoSbpm: string;
  observacao: string;
}

export interface StatusHistoricoPatrimonio {
  id: number;
  idItem: number;
  patrimonio: string;
  descricao: string;
  statusAnterior: string;
  statusNovo: string;
  motivo: string;
  idUsuario: number;
  usuario: string;
  criadoEm: string;
}

export const STATUS_META: Record<StatusChamado, { label: string; cor: string; corBg: string; corText: string }> = {
  aberto:      { label: "Novo",           cor: "#5CC9BD", corBg: "#D1EBE8", corText: "#0F4F4A" },
  atendimento: { label: "Em atendimento", cor: "#E56E14", corBg: "#FCE5D0", corText: "#7A3A0B" },
  aguardando:  { label: "Aguardando",     cor: "#EDBA94", corBg: "#FBEAD9", corText: "#6E4520" },
  aguardando_autorizacao: { label: "Aguardando autorização", cor: "#7B68C0", corBg: "#E8E2F7", corText: "#3D2A70" },
  prodam:      { label: "Aguardando PRODAM", cor: "#9A68C0", corBg: "#EEE2F7", corText: "#4F2A70" },
  resolvido:   { label: "Resolvido",      cor: "#0A328D", corBg: "#D9E1F4", corText: "#0A328D" },
  fechado:     { label: "Fechado",        cor: "#8A93A6", corBg: "#E8EAF0", corText: "#3D4658" },
};

export const PRIORIDADE_META: Record<Prioridade, { label: string; corBg: string; corText: string }> = {
  baixa:   { label: "Baixa",   corBg: "#EEF2F7", corText: "#4A5468" },
  media:   { label: "Média",   corBg: "#FBEAD9", corText: "#6E4520" },
  alta:    { label: "Alta",    corBg: "#FCE5D0", corText: "#7A3A0B" },
  urgente: { label: "Urgente", corBg: "#FBDADA", corText: "#7A1F1F" },
};
