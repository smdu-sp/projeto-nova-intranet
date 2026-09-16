import type { Unidade, Categoria, Usuario, Chamado, ItemPatrimonio, Transferencia } from '../_types';
import { buildUnidadesMock } from '@/lib/helpdesk/mock-dados';

/** Apenas para mocks locais (transferências demo); id = codigo até carregar da API. */
export const UNIDADES: Unidade[] = buildUnidadesMock().map((u) => ({
  id: u.codigo,
  full: u.nome,
  raiz: u.raiz,
  sigla: u.sigla,
  codigo: u.codigo,
  sala: u.sala ?? undefined,
}));

const CATEGORIAS_RAW = [
  "Backup",
  "Computador > Defeito", "Computador > Lentidão", "Computador > Movimentação de computador",
  "Computador > Não liga", "Computador > Reiniciando",
  "Configuração", "Criação de usuário de rede",
  "Impressora > Configurar Impressora no computador", "Impressora > Defeito",
  "Impressora > Não liga", "Impressora > Sem tinta",
  "Instalação de hardware", "Instalação de impressora", "Instalação de sistema", "Instalação de Software",
  "Instalar scanner", "Internet lenta", "Liberação de acesso",
  "Limpeza usuários Intranet", "Limpeza usuários Sistema SGU", "Login expirado",
  "Monitor > Defeito", "Monitor > Instalação", "Monitor > Movimentação",
  "Mouse com defeito", "Mudança de equipamento de local",
  "Plotter > Configurar Plotter no computador",
  "Rede > Criar novos pontos de rede", "Rede > Sem internet",
  "Reset de senha de rede",
  "Scanner > Configurar scanner no computador", "Scanner > Defeito",
  "Senha de Rede > Desbloqueio", "Senha de Rede > Reset"
];

export const CATEGORIAS: Categoria[] = CATEGORIAS_RAW.map((c, i) => {
  const parts = c.split(" > ");
  return { id: i + 1, nome: parts[parts.length - 1], full: c, pai: parts[0], filho: parts[1] || null, area: null };
});

export const CATEGORIAS_PAI = [...new Set(CATEGORIAS.map(c => c.pai))];

export const USUARIOS: Usuario[] = [
  { id: 1, usuario: "ricardo.lima",    nome: "Ricardo Lima",    permissao: 1, perfil: "ADM", email: "ricardo.lima@prefeitura.gov",    telefone: "(11) 3396-1001", statususer: "Ativo" },
  { id: 2, usuario: "patricia.alves",  nome: "Patrícia Alves",  permissao: 2, perfil: "TEC", email: "patricia.alves@prefeitura.gov",  telefone: "(11) 3396-1002", statususer: "Ativo" },
  { id: 3, usuario: "marcos.tavares",  nome: "Marcos Tavares",  permissao: 2, perfil: "TEC", email: "marcos.tavares@prefeitura.gov",  telefone: "(11) 3396-1003", statususer: "Ativo" },
  { id: 4, usuario: "joana.ribeiro",   nome: "Joana Ribeiro",   permissao: 3, perfil: "USR", email: "joana.ribeiro@prefeitura.gov",   telefone: "(11) 3396-2041", statususer: "Ativo" },
  { id: 5, usuario: "carlos.menezes",  nome: "Carlos Menezes",  permissao: 3, perfil: "USR", email: "carlos.menezes@prefeitura.gov",  telefone: "(11) 3396-2110", statususer: "Ativo" },
  { id: 6, usuario: "luiza.barbosa",   nome: "Luiza Barbosa",   permissao: 3, perfil: "USR", email: "luiza.barbosa@prefeitura.gov",   telefone: "(11) 3396-3081", statususer: "Ativo" },
  { id: 7, usuario: "andre.silva",     nome: "André Silva",     permissao: 3, perfil: "USR", email: "andre.silva@prefeitura.gov",     telefone: "(11) 3396-2560", statususer: "Ativo" },
  { id: 8, usuario: "fernanda.costa",  nome: "Fernanda Costa",  permissao: 3, perfil: "USR", email: "fernanda.costa@prefeitura.gov",  telefone: "(11) 3396-1300", statususer: "Ativo" },
  { id: 9, usuario: "rafael.moreira",  nome: "Rafael Moreira",  permissao: 2, perfil: "TEC", email: "rafael.moreira@prefeitura.gov",  telefone: "(11) 3396-1004", statususer: "Ativo" },
  { id: 10, usuario: "tatiana.duarte", nome: "Tatiana Duarte",  permissao: 3, perfil: "USR", email: "tatiana.duarte@prefeitura.gov",  telefone: "(11) 3396-2220", statususer: "Inativo" }
];

function areaMockPorCategoria(categoria: string): Chamado['areaAtual'] {
  const c = categoria.toLowerCase();
  if (c.includes('liberação') || c.includes('senha') || c.includes('login') || c.includes('usuário')) {
    return 'acesso_sistemas';
  }
  if (c.includes('internet') || c.includes('rede')) {
    return 'rede_conectividade';
  }
  if (c.includes('mudança de equipamento')) {
    return 'reparos_infraestrutura';
  }
  return 'suporte_tecnico';
}

const CHAMADOS_BASE: Omit<Chamado, 'areaOrigem' | 'areaAtual' | 'encaminhamentos'>[] = [
  {
    id: 4821, titulo: "Computador não liga após queda de energia",
    categoria: "Computador > Não liga", status: "aberto", prioridade: "alta",
    solicitante: 4, tecnicos: [], observadores: [], telefone: "(11) 3396-2041",
    unidade: "CAP > ARTHUR SABOYA",
    item: 1, abertura: "2026-05-18T08:42",
    descricao: "Após a queda de energia de ontem à noite, o computador da estação 3 não liga mais. O LED da fonte pisca rapidamente quando aperto o botão.",
    eventos: [{ tipo: "abertura", autor: 4, data: "2026-05-18T08:42", texto: "Chamado aberto" }],
    mensagens: [],
  },
  {
    id: 4820, titulo: "Impressora HP do setor sem tinta — trocar toner",
    categoria: "Impressora > Sem tinta", status: "atendimento", prioridade: "media",
    solicitante: 5, tecnicos: [2], observadores: [], telefone: "(11) 3396-2110",
    unidade: "CAF > DGP",
    item: 4, abertura: "2026-05-18T07:15",
    descricao: "A impressora da sala da DGP está sem tinta há dois dias. Já avisamos por e-mail mas ainda não foi resolvido.",
    eventos: [
      { tipo: "abertura",    autor: 5, data: "2026-05-18T07:15", texto: "Chamado aberto" },
      { tipo: "atribuicao",  autor: 1, data: "2026-05-18T09:00", texto: "Atribuído a Patrícia Alves" },
    ],
    mensagens: [
      { id: 1, autor: 5, data: "2026-05-18T07:20", tipo: "publica", texto: "A impressora começou a sair com a impressão bem clara, daí parou de imprimir. O painel mostra 'Toner muito baixo'." },
      { id: 2, autor: 2, data: "2026-05-18T09:12", tipo: "publica", texto: "Olá! Confirmei estoque de toner HP 26X. Vou levar hoje à tarde, por volta das 14h. Pode ser?" },
      { id: 3, autor: 5, data: "2026-05-18T09:25", tipo: "publica", texto: "Pode sim, Patrícia. Vou estar na sala o dia todo. Obrigada!" },
      { id: 4, autor: 2, data: "2026-05-18T09:28", tipo: "publica", texto: "Combinado. Qualquer coisa, te aviso por aqui." },
    ],
  },
  {
    id: 4819, titulo: "Reset de senha de rede — não consigo entrar no domínio",
    categoria: "Senha de Rede > Reset", status: "resolvido", prioridade: "media",
    solicitante: 6, tecnicos: [3], observadores: [], telefone: "(11) 3396-3081",
    unidade: "PARHIS > DHGP",
    item: null, abertura: "2026-05-17T14:30",
    descricao: "Esqueci minha senha de rede após o período de férias. Preciso entrar no sistema SGU.",
    resolucao: "Senha resetada. Solicitante orientado a trocar no primeiro login.",
    eventos: [
      { tipo: "abertura",   autor: 6, data: "2026-05-17T14:30", texto: "Chamado aberto" },
      { tipo: "atribuicao", autor: 1, data: "2026-05-17T14:45", texto: "Atribuído a Marcos Tavares" },
      { tipo: "resolucao",  autor: 3, data: "2026-05-17T15:12", texto: "Resolvido" },
    ],
    mensagens: [
      { id: 5, autor: 3, data: "2026-05-17T15:10", tipo: "solucao", texto: "Senha resetada. Solicitante orientado a trocar no primeiro login." },
    ],
  },
  {
    id: 4818, titulo: "Internet lenta no andar inteiro",
    categoria: "Internet lenta", status: "atendimento", prioridade: "urgente",
    solicitante: 7, tecnicos: [9, 3], observadores: [1], telefone: "(11) 3396-2560",
    unidade: "CONTRU > DINS",
    item: null, abertura: "2026-05-17T11:05",
    descricao: "Desde manhã todo o pavimento da DINS está com internet praticamente parada. Cinco pessoas reclamaram presencialmente.",
    eventos: [
      { tipo: "abertura",   autor: 7, data: "2026-05-17T11:05", texto: "Chamado aberto" },
      { tipo: "atribuicao", autor: 1, data: "2026-05-17T11:08", texto: "Atribuído a Rafael Moreira e Marcos Tavares" },
    ],
    mensagens: [
      { id: 6,  autor: 7, data: "2026-05-17T11:07", tipo: "publica", texto: "Está MUITO lento, gente. Não consigo nem abrir o SGU. Cinco pessoas já vieram reclamar comigo." },
      { id: 7,  autor: 9, data: "2026-05-17T11:30", tipo: "publica", texto: "Oi! Já estamos verificando o switch do andar — há indícios de loop. Você consegue conferir se algum cabo de rede solto foi conectado em dois pontos?" },
      { id: 8,  autor: 7, data: "2026-05-17T11:42", tipo: "publica", texto: "Achei aqui! Tinha um cabo ligando duas tomadas perto da sala 12. Desliguei." },
      { id: 9,  autor: 9, data: "2026-05-17T11:45", tipo: "publica", texto: "Perfeito, era isso mesmo. O switch já está reabsorvendo o tráfego. Em uns 2 minutos volta ao normal." },
      { id: 10, autor: 7, data: "2026-05-17T11:52", tipo: "publica", texto: "Voltou! Obrigada pela rapidez" },
    ],
  },
  {
    id: 4817, titulo: "Configurar impressora nova no computador da chefia",
    categoria: "Impressora > Configurar Impressora no computador", status: "aguardando", prioridade: "baixa",
    solicitante: 8, tecnicos: [2], observadores: [], telefone: "(11) 3396-1300",
    unidade: "GABINETE > ASCOM",
    item: 7, abertura: "2026-05-16T16:20",
    descricao: "Recebemos a impressora nova. Preciso configurar nos 3 computadores da sala da chefia.",
    eventos: [
      { tipo: "abertura",   autor: 8, data: "2026-05-16T16:20", texto: "Chamado aberto" },
      { tipo: "atribuicao", autor: 1, data: "2026-05-16T16:35", texto: "Atribuído a Patrícia Alves" },
    ],
    mensagens: [
      { id: 11, autor: 2, data: "2026-05-17T08:00", tipo: "publica", texto: "Bom dia! Vi o chamado. Para configurar, preciso do IP fixo desejado para a impressora. Você tem essa informação?" },
      { id: 12, autor: 8, data: "2026-05-17T08:42", tipo: "publica", texto: "Bom dia, Patrícia. Vou conferir com o pessoal da rede e te respondo ainda hoje." },
    ],
  },
  {
    id: 4816, titulo: "Monitor com tela piscando — DPCI",
    categoria: "Monitor > Defeito", status: "resolvido", prioridade: "media",
    solicitante: 4, tecnicos: [3], observadores: [], telefone: "(11) 3396-2041",
    unidade: "CAP > DPCI",
    item: 12, abertura: "2026-05-16T10:00",
    descricao: "Monitor da estação 7 pisca a tela em intervalos curtos. Já trocamos o cabo e o problema persiste.",
    resolucao: "Monitor substituído por unidade do estoque. Patrimônio atualizado.",
    eventos: [
      { tipo: "abertura",   autor: 4, data: "2026-05-16T10:00", texto: "Chamado aberto" },
      { tipo: "atribuicao", autor: 1, data: "2026-05-16T10:30", texto: "Atribuído a Marcos Tavares" },
      { tipo: "resolucao",  autor: 3, data: "2026-05-16T13:25", texto: "Resolvido" },
    ],
    mensagens: [
      { id: 13, autor: 3, data: "2026-05-16T13:20", tipo: "solucao", texto: "Monitor substituído por unidade do estoque. Patrimônio atualizado." },
    ],
  },
  {
    id: 4815, titulo: "Liberação de acesso ao SGU para novo servidor",
    categoria: "Liberação de acesso", status: "aberto", prioridade: "media",
    solicitante: 5, tecnicos: [], observadores: [], telefone: "(11) 3396-2110",
    unidade: "CAF > DGP",
    item: null, abertura: "2026-05-15T09:50",
    descricao: "Servidor recém-empossado precisa de acesso ao sistema SGU módulo financeiro.",
    eventos: [{ tipo: "abertura", autor: 5, data: "2026-05-15T09:50", texto: "Chamado aberto" }],
    mensagens: [],
  },
  {
    id: 4814, titulo: "Mouse com defeito — não responde ao clique",
    categoria: "Mouse com defeito", status: "fechado", prioridade: "baixa",
    solicitante: 6, tecnicos: [2], observadores: [], telefone: "(11) 3396-3081",
    unidade: "PARHIS > DHGP",
    item: null, abertura: "2026-05-14T15:00",
    descricao: "Mouse parou de responder ao clique esquerdo.",
    resolucao: "Entregue mouse novo de reposição.",
    eventos: [
      { tipo: "abertura",  autor: 6, data: "2026-05-14T15:00", texto: "Chamado aberto" },
      { tipo: "resolucao", autor: 2, data: "2026-05-14T15:32", texto: "Resolvido" },
      { tipo: "fechamento", autor: 6, data: "2026-05-15T08:00", texto: "Solicitante confirmou solução" },
    ],
    mensagens: [
      { id: 14, autor: 2, data: "2026-05-14T15:30", tipo: "solucao", texto: "Entregue mouse novo de reposição." },
    ],
  },
  {
    id: 4813, titulo: "Mudança de equipamento — sala 12 para sala 8",
    categoria: "Mudança de equipamento de local", status: "atendimento", prioridade: "baixa",
    solicitante: 8, tecnicos: [9], observadores: [], telefone: "(11) 3396-1300",
    unidade: "GABINETE > ASCOM",
    item: 3, abertura: "2026-05-14T11:00",
    descricao: "Precisamos remover 2 computadores da sala 12 e instalar na sala 8.",
    eventos: [
      { tipo: "abertura",   autor: 8, data: "2026-05-14T11:00", texto: "Chamado aberto" },
      { tipo: "atribuicao", autor: 1, data: "2026-05-14T11:15", texto: "Atribuído a Rafael Moreira" },
    ],
    mensagens: [],
  }
];

export const CHAMADOS: Chamado[] = CHAMADOS_BASE.map((c) => {
  const area = areaMockPorCategoria(c.categoria);
  return {
    ...c,
    areaOrigem: area,
    areaAtual: area,
    encaminhamentos: [],
  };
});

export const ITENS: ItemPatrimonio[] = [
  { idbem: 1,  patrimonio: "2024-001847", tipo: "Computador", descsbpm: "Desktop Dell OptiPlex 7090",           numserie: "DL7090X12849",   marca: "Dell",     modelo: "OptiPlex 7090",         localizacao: "CAP > ARTHUR SABOYA", servidor: "Joana Ribeiro",  servidorId: 4,  cimbpm: "CIM-89421", statusitem: "Ativo" },
  { idbem: 2,  patrimonio: "2024-001848", tipo: "Computador", descsbpm: "Desktop Dell OptiPlex 7090",           numserie: "DL7090X12850",   marca: "Dell",     modelo: "OptiPlex 7090",         localizacao: "CAP > ARTHUR SABOYA", servidor: "—",              servidorId: null, cimbpm: "CIM-89422", statusitem: "Ativo" },
  { idbem: 3,  patrimonio: "2024-001902", tipo: "Computador", descsbpm: "Notebook Lenovo ThinkPad E14",         numserie: "LV-E14-PR9921",  marca: "Lenovo",   modelo: "ThinkPad E14",          localizacao: "GABINETE > ASCOM",    servidor: "Fernanda Costa", servidorId: 8,  cimbpm: "CIM-89510", statusitem: "Ativo" },
  { idbem: 4,  patrimonio: "2023-009123", tipo: "Impressora", descsbpm: "Impressora HP LaserJet Pro M404n",     numserie: "HP-M404-58721",  marca: "HP",       modelo: "LaserJet Pro M404n",    localizacao: "CAF > DGP",           servidor: "Carlos Menezes", servidorId: null, cimbpm: "CIM-78112", statusitem: "Manutenção" },
  { idbem: 5,  patrimonio: "2023-009201", tipo: "Impressora", descsbpm: "Multifuncional Epson EcoTank L3250",   numserie: "EP-L3250-44712", marca: "Epson",    modelo: "EcoTank L3250",         localizacao: "CONTRU > DINS",       servidor: "André Silva",    servidorId: 7,  cimbpm: "CIM-78240", statusitem: "Ativo" },
  { idbem: 6,  patrimonio: "2024-002033", tipo: "Monitor",    descsbpm: "Monitor LG 24'' UltraGear",            numserie: "LG-24UG-99102",  marca: "LG",       modelo: "24UG650",               localizacao: "GTEC",                servidor: "Patrícia Alves", servidorId: null, cimbpm: "CIM-90021", statusitem: "Ativo" },
  { idbem: 7,  patrimonio: "2024-002101", tipo: "Impressora", descsbpm: "Impressora HP Color LaserJet M255dw",  numserie: "HP-M255-77001",  marca: "HP",       modelo: "Color LaserJet M255dw", localizacao: "GABINETE > ASCOM",    servidor: "—",              servidorId: null, cimbpm: "CIM-90099", statusitem: "Ativo" },
  { idbem: 8,  patrimonio: "2022-007722", tipo: "Computador", descsbpm: "Desktop HP ProDesk 400 G6",            numserie: "HP-PD400-32109", marca: "HP",       modelo: "ProDesk 400 G6",        localizacao: "CONTRU > DINS",       servidor: "André Silva",    servidorId: 7,  cimbpm: "CIM-65422", statusitem: "Ativo" },
  { idbem: 9,  patrimonio: "2022-007811", tipo: "Computador", descsbpm: "Desktop HP ProDesk 400 G6",            numserie: "HP-PD400-32208", marca: "HP",       modelo: "ProDesk 400 G6",        localizacao: "CASE > DCAD",         servidor: "—",              servidorId: null, cimbpm: "CIM-65512", statusitem: "Ativo" },
  { idbem: 10, patrimonio: "2023-008910", tipo: "Notebook",   descsbpm: "Notebook Dell Latitude 3420",          numserie: "DL-LT3420-11221",marca: "Dell",     modelo: "Latitude 3420",         localizacao: "GTEC",                servidor: "Marcos Tavares", servidorId: null, cimbpm: "CIM-77001", statusitem: "Ativo" },
  { idbem: 11, patrimonio: "2024-002250", tipo: "Plotter",    descsbpm: "Plotter HP DesignJet T230",            numserie: "HP-DJT230-12009",marca: "HP",       modelo: "DesignJet T230",        localizacao: "PLANURB",             servidor: "—",              servidorId: null, cimbpm: "CIM-91020", statusitem: "Ativo" },
  { idbem: 12, patrimonio: "2023-009544", tipo: "Monitor",    descsbpm: "Monitor Samsung 22'' F22T350",         numserie: "SS-F22T-88321",  marca: "Samsung",  modelo: "F22T350",               localizacao: "CAP > DPCI",          servidor: "—",              servidorId: null, cimbpm: "CIM-79430", statusitem: "Ativo" },
  { idbem: 13, patrimonio: "2024-002310", tipo: "Scanner",    descsbpm: "Scanner Epson DS-1630",                numserie: "EP-DS1630-55012",marca: "Epson",    modelo: "DS-1630",               localizacao: "PARHIS > DHGP",       servidor: "Luiza Barbosa",  servidorId: null, cimbpm: "CIM-91200", statusitem: "Ativo" },
  { idbem: 14, patrimonio: "2022-006501", tipo: "Computador", descsbpm: "Desktop Positivo Master D420",         numserie: "PS-D420-21011",  marca: "Positivo", modelo: "Master D420",           localizacao: "CASE > DDU",          servidor: "—",              servidorId: null, cimbpm: "CIM-60112", statusitem: "Ativo" },
  { idbem: 15, patrimonio: "2024-002400", tipo: "Notebook",   descsbpm: "Notebook Lenovo ThinkPad T14",         numserie: "LV-T14-91220",   marca: "Lenovo",   modelo: "ThinkPad T14",          localizacao: "GTEC",                servidor: "Rafael Moreira", servidorId: null, cimbpm: "CIM-91440", statusitem: "Ativo" }
];

export const TRANSFERENCIAS: Transferencia[] = [
  {
    id: 301, dataTransferencia: "2026-05-15T14:20", idUsuarioRegistro: 2, idUnidadeDestino: "UND-009",
    unidadeDestino: "CAP > ARTHUR SABOYA", cimbpm: "TRF-2026-0301",
    observacao: "Reposição de equipamentos após reforma da sala",
    itens: [
      { id: 1, idItem: 1, servidorAnterior: "Estoque", servidorAtual: "Joana Ribeiro" },
      { id: 2, idItem: 2, servidorAnterior: "Estoque", servidorAtual: "—" }
    ]
  },
  {
    id: 300, dataTransferencia: "2026-05-12T10:00", idUsuarioRegistro: 9, idUnidadeDestino: "UND-044",
    unidadeDestino: "PLANURB", cimbpm: "TRF-2026-0300",
    observacao: "Plotter solicitada via processo 2026.0.000.4128",
    itens: [{ id: 3, idItem: 11, servidorAnterior: "Estoque", servidorAtual: "—" }]
  },
  {
    id: 299, dataTransferencia: "2026-05-08T09:15", idUsuarioRegistro: 2, idUnidadeDestino: "UND-032",
    unidadeDestino: "GABINETE > ASCOM", cimbpm: "TRF-2026-0299",
    observacao: "Substituição de monitor com defeito",
    itens: [{ id: 4, idItem: 7, servidorAnterior: "Estoque", servidorAtual: "—" }]
  },
  {
    id: 298, dataTransferencia: "2026-04-29T16:40", idUsuarioRegistro: 3, idUnidadeDestino: "UND-024",
    unidadeDestino: "CONTRU > DINS", cimbpm: "TRF-2026-0298",
    observacao: "Atendimento de chamado #4711",
    itens: [
      { id: 5, idItem: 5, servidorAnterior: "Estoque", servidorAtual: "André Silva" },
      { id: 6, idItem: 8, servidorAnterior: "—", servidorAtual: "André Silva" }
    ]
  }
];

/** Cores da mensagem de solução (GLPI 11: --glpi-timeline-solution-*) */
export const GLPI_SOLUCAO = {
  bg: "#9fd6ed",
  fg: "#27363b",
  border: "#90c2d8",
} as const;

export function isMensagemSolucao(
  texto: string,
  tipo: string,
  resolucao?: string
): boolean {
  if (tipo === "solucao") return true;
  if (!resolucao) return false;
  return texto.trim() === resolucao.trim();
}

export function fmtData(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} · ${hh}:${mi}`;
}

export function fmtDataCurta(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function tempoRelativo(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const agora = new Date("2026-05-19T10:00").getTime();
  const min = Math.floor((agora - d) / 60000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  return `há ${dias} d`;
}

export function iniciais(nome: string): string {
  if (!nome) return "—";
  const partes = nome.split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes[partes.length - 1]?.[0] || "")).toUpperCase();
}

/** Primeiro e último nome (ex.: "João Pedro Silva" → "João Silva"). */
export function nomePrimeiroUltimo(nome: string): string {
  if (!nome?.trim()) return "—";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] ?? "—";
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

export function usuarioPorId(id: number): Usuario | null {
  return USUARIOS.find(u => u.id === id) || null;
}

export function itemPorId(id: number): ItemPatrimonio | null {
  return ITENS.find(i => i.idbem === id) || null;
}
