'use client';

import DataTable from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	STATUS_REDE,
	STATUS_REDE_META,
	TIPOS_EQUIPAMENTO,
	TIPO_EQUIPAMENTO_LABEL,
} from '@/lib/inventario/equipamento';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { criarColunas } from './columns';
import type { EquipamentoRow, UnidadeRef, UsuarioRef } from './tipos';

const TODOS = '__todos__';

export default function TabelaEquipamentos({
	data,
	unidades,
	usuarios,
}: {
	data: EquipamentoRow[];
	unidades: UnidadeRef[];
	usuarios: UsuarioRef[];
}) {
	const [texto, setTexto] = useState('');
	const [tipo, setTipo] = useState<string>(TODOS);
	const [status, setStatus] = useState<string>(TODOS);
	const [unidade, setUnidade] = useState<string>(TODOS);
	const [patrimonio, setPatrimonio] = useState<string>(TODOS);
	const [disco, setDisco] = useState<string>(TODOS);

	const columns = useMemo(
		() => criarColunas(unidades, usuarios),
		[unidades, usuarios],
	);

	const filtrados = useMemo(() => {
		const q = texto.trim().toLowerCase();
		return data.filter((e) => {
			if (tipo !== TODOS && e.tipo !== tipo) return false;
			if (status !== TODOS && e.statusRede !== status) return false;
			if (unidade === '__sem__' ? e.unidadeId !== null : unidade !== TODOS && e.unidadeId !== unidade)
				return false;
			if (patrimonio === 'com' && !e.itemId) return false;
			if (patrimonio === 'sem' && e.itemId) return false;
			if (disco !== TODOS && !e.discos.some((d) => d.tipoMidia === disco)) return false;
			if (q) {
				const campos = [
					e.hostname,
					e.nome,
					e.ip,
					e.mac,
					e.numserie,
					e.fabricante,
					e.modelo,
					e.item?.patrimonio,
					e.servidor?.nome,
				];
				if (!campos.some((c) => c?.toLowerCase().includes(q))) return false;
			}
			return true;
		});
	}, [data, texto, tipo, status, unidade, patrimonio, disco]);

	const temFiltro =
		texto !== '' ||
		tipo !== TODOS ||
		status !== TODOS ||
		unidade !== TODOS ||
		patrimonio !== TODOS ||
		disco !== TODOS;

	function limpar() {
		setTexto('');
		setTipo(TODOS);
		setStatus(TODOS);
		setUnidade(TODOS);
		setPatrimonio(TODOS);
		setDisco(TODOS);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<Input
					placeholder="Buscar por hostname, IP, MAC, série, patrimônio…"
					value={texto}
					onChange={(e) => setTexto(e.target.value)}
					className="w-full sm:w-80"
				/>
				<Select value={tipo} onValueChange={setTipo}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={TODOS}>Todos os tipos</SelectItem>
						{TIPOS_EQUIPAMENTO.map((t) => (
							<SelectItem key={t} value={t}>
								{TIPO_EQUIPAMENTO_LABEL[t]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={status} onValueChange={setStatus}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Rede" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={TODOS}>Todos os status</SelectItem>
						{STATUS_REDE.map((s) => (
							<SelectItem key={s} value={s}>
								{STATUS_REDE_META[s].label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={unidade} onValueChange={setUnidade}>
					<SelectTrigger className="w-[170px]">
						<SelectValue placeholder="Unidade" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={TODOS}>Todas as unidades</SelectItem>
						<SelectItem value="__sem__">Sem unidade</SelectItem>
						{unidades.map((u) => (
							<SelectItem key={u.id} value={u.id}>
								{u.nome}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={patrimonio} onValueChange={setPatrimonio}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Patrimônio" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={TODOS}>Patrimônio: todos</SelectItem>
						<SelectItem value="com">Com patrimônio</SelectItem>
						<SelectItem value="sem">Sem patrimônio</SelectItem>
					</SelectContent>
				</Select>
				<Select value={disco} onValueChange={setDisco}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Disco" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={TODOS}>Disco: todos</SelectItem>
						<SelectItem value="SSD">SSD</SelectItem>
						<SelectItem value="HDD">HDD</SelectItem>
					</SelectContent>
				</Select>
				{temFiltro ? (
					<Button variant="ghost" size="sm" onClick={limpar}>
						<X size={16} /> Limpar
					</Button>
				) : null}
			</div>

			<p className="text-xs text-muted-foreground">
				{filtrados.length} de {data.length} equipamento(s)
			</p>

			<DataTable
				columns={columns}
				data={filtrados}
				paginaAtual={1}
				limitePorPagina={Math.max(filtrados.length, 1)}
				totalItens={filtrados.length}
				labelItemSingular="equipamento"
				labelItemPlural="equipamentos"
			/>
		</div>
	);
}
