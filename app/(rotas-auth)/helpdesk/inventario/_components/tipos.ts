import type {
  MetodoColeta,
  StatusRede,
  TipoEquipamento,
} from '@/lib/inventario/equipamento';

export type UnidadeRef = { id: string; nome: string };
export type UsuarioRef = { id: string; nome: string };

/** Linha da tabela de equipamentos (corresponde a equipamentoListSelect). */
export type EquipamentoRow = {
  id: number;
  tipo: TipoEquipamento;
  hostname: string | null;
  nome: string | null;
  ip: string | null;
  mac: string | null;
  fabricante: string | null;
  modelo: string | null;
  numserie: string | null;
  statusRede: StatusRede;
  ultimoContato: string | null;
  ultimaColeta: string | null;
  metodoColeta: MetodoColeta | null;
  unidadeId: string | null;
  servidorId: string | null;
  itemId: number | null;
  unidade: UnidadeRef | null;
  servidor: UsuarioRef | null;
  item: { idbem: number; patrimonio: string | null } | null;
  discos: { tipoMidia: string | null; modeloFisico: string | null }[];
};
