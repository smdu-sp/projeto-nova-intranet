'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	STATUS_REDE_META,
	TIPO_EQUIPAMENTO_LABEL,
} from '@/lib/inventario/equipamento';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import ModalDelete from './modal-delete';
import ModalUpdateAndCreate from './modal-update-create';
import type { EquipamentoRow, UnidadeRef, UsuarioRef } from './tipos';

export function criarColunas(
	unidades: UnidadeRef[],
	usuarios: UsuarioRef[],
): ColumnDef<EquipamentoRow>[] {
	return [
		{
			accessorKey: 'tipo',
			header: 'Tipo',
			cell: ({ row }) => TIPO_EQUIPAMENTO_LABEL[row.original.tipo] ?? row.original.tipo,
		},
		{
			accessorKey: 'hostname',
			header: 'Hostname / Nome',
			cell: ({ row }) => {
				const label = row.original.hostname || row.original.nome || `#${row.original.id}`;
				return (
					<Link
						href={`/helpdesk/inventario/${row.original.id}`}
						className="font-medium text-primary hover:underline"
					>
						{label}
					</Link>
				);
			},
		},
		{
			accessorKey: 'ip',
			header: 'IP',
			cell: ({ row }) => row.original.ip ?? '—',
		},
		{
			accessorKey: 'statusRede',
			header: () => <p className="text-center">Rede</p>,
			cell: ({ row }) => {
				const meta = STATUS_REDE_META[row.original.statusRede];
				return (
					<div className="flex justify-center">
						<span
							className="rounded-full px-2 py-0.5 text-xs font-medium"
							style={{ backgroundColor: meta.corBg, color: meta.corText }}
						>
							{meta.label}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: 'unidade',
			header: 'Unidade',
			cell: ({ row }) => row.original.unidade?.nome ?? '—',
		},
		{
			accessorKey: 'servidor',
			header: 'Responsável',
			cell: ({ row }) => row.original.servidor?.nome ?? '—',
		},
		{
			accessorKey: 'discos',
			header: () => <p className="text-center">Disco</p>,
			cell: ({ row }) => {
				const discos = row.original.discos.filter((d) => d.tipoMidia);
				if (discos.length === 0) return <p className="text-center text-xs text-muted-foreground">—</p>;
				const tipos = new Map(discos.map((d) => [d.tipoMidia, d.modeloFisico]));
				return (
					<div className="flex flex-wrap justify-center gap-1">
						{[...tipos].map(([t, modelo]) => (
							<span
								key={t}
								title={modelo ?? undefined}
								className={`rounded-full px-2 py-0.5 text-xs font-medium ${
									t === 'SSD'
										? 'bg-emerald-100 text-emerald-800'
										: t === 'HDD'
											? 'bg-amber-100 text-amber-800'
											: 'bg-muted text-muted-foreground'
								}`}
							>
								{t}
							</span>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: 'item',
			header: () => <p className="text-center">Patrimônio</p>,
			cell: ({ row }) => (
				<div className="flex justify-center">
					{row.original.item?.patrimonio ? (
						<Badge variant="secondary">{row.original.item.patrimonio}</Badge>
					) : (
						<span className="text-xs text-muted-foreground">não vinculado</span>
					)}
				</div>
			),
		},
		{
			accessorKey: 'actions',
			header: () => <p className="text-center">Ações</p>,
			cell: ({ row }) => (
				<div className="flex gap-2 items-center justify-center" key={row.id}>
					<Button asChild size="icon" variant="outline">
						<Link href={`/helpdesk/inventario/${row.original.id}`}>
							<Eye size={20} />
						</Link>
					</Button>
					<ModalUpdateAndCreate
						isUpdating
						equipamento={row.original}
						unidades={unidades}
						usuarios={usuarios}
					/>
					<ModalDelete id={row.original.id} />
				</div>
			),
		},
	];
}
