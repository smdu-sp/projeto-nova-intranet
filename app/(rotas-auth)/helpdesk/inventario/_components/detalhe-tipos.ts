import type {
	MetodoColeta,
	StatusRede,
	TipoEquipamento,
} from '@/lib/inventario/equipamento';

export type EquipamentoDetalhe = {
	id: number;
	tipo: TipoEquipamento;
	hostname: string | null;
	nome: string | null;
	ip: string | null;
	mac: string | null;
	fabricante: string | null;
	modelo: string | null;
	numserie: string | null;
	so: string | null;
	soVersao: string | null;
	soBuild: string | null;
	usuarioLogado: string | null;
	dominio: string | null;
	statusRede: StatusRede;
	ultimoContato: string | null;
	ultimaColeta: string | null;
	metodoColeta: MetodoColeta | null;
	criadoEm: string;
	atualizadoEm: string;
	unidade: { id: string; nome: string } | null;
	servidor: { id: string; nome: string } | null;
	item: {
		idbem: number;
		patrimonio: string | null;
		tipo: string | null;
		descsbpm: string | null;
		numserie: string | null;
		statusitem: string;
	} | null;
	hardware: {
		cpuModelo: string | null;
		cpuNucleos: number | null;
		ramTotalMb: number | null;
		placaMae: string | null;
		bios: string | null;
		placaVideo: string | null;
	} | null;
	discos: {
		id: number;
		modelo: string | null;
		tamanhoMb: number | null;
		livreMb: number | null;
		tipoMidia: string | null;
		modeloFisico: string | null;
	}[];
	softwares: {
		id: number;
		nome: string;
		fabricante: string | null;
		versao: string | null;
		proibido: boolean;
	}[];
	historico: {
		id: number;
		campo: string;
		valorAnterior: string | null;
		valorNovo: string | null;
		origem: MetodoColeta;
		criadoEm: string;
	}[];
	localizacoes: {
		id: number;
		predio: string | null;
		andar: string | null;
		sala: string | null;
		mesa: string | null;
		atual: boolean;
		criadoEm: string;
	}[];
	alertas: {
		id: number;
		tipo: string;
		mensagem: string;
		criadoEm: string;
	}[];
};
