'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertaMovimentacaoAtic } from './alerta-movimentacao-atic';

export default function ModalDelete({
	idbem,
	inativo,
	localizacaoAtual,
	servidorAtual,
}: {
	idbem: number;
	inativo: boolean;
	localizacaoAtual?: string;
	servidorAtual?: string;
}) {
	const [motivo, setMotivo] = useState('');
	const [isPending, startTransition] = useTransition();

	async function handleAction() {
		if (!motivo.trim()) {
			toast.error('Informe o motivo da alteração de status');
			return;
		}

		try {
			const res = await fetch(`/api/helpdesk/itens/${idbem}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					statusitem: inativo ? 'Ativo' : 'Inativo',
					motivo: motivo.trim(),
				}),
			});
			if (!res.ok) {
				let message = `Falha ao alterar status (HTTP ${res.status})`;
				try {
					const data: unknown = await res.json();
					if (
						typeof data === 'object' &&
						data !== null &&
						'error' in data &&
						typeof data.error === 'string'
					) {
						message = data.error;
					}
				} catch {
					// Mantém a mensagem com o código HTTP quando a resposta não for JSON.
				}
				toast.error('Erro', { description: message });
				return;
			}
		} catch {
			toast.error('Falha na comunicação com o servidor ao alterar status');
			return;
		}

		toast.success(
			inativo
				? 'Item reativado com sucesso'
				: 'Item desativado com sucesso',
		);
		setMotivo('');
		window.location.reload();
	}

	return (
		<Dialog
			onOpenChange={(v) => {
				if (!v) setMotivo('');
			}}
		>
			<DialogTrigger asChild>
				<Button
					size="icon"
					variant="outline"
					title={inativo ? 'Reativar item' : 'Desativar item'}
					className={`h-8 w-8 shrink-0 ${
						inativo
							? 'hover:bg-primary cursor-pointer hover:text-white group transition-all ease-linear duration-200'
							: 'hover:bg-destructive cursor-pointer hover:text-white group transition-all ease-linear duration-200'
					}`}
				>
					{inativo ? (
						<Check size={24} className="text-primary dark:text-white group-hover:text-white group" />
					) : (
						<Trash2 size={24} className="text-destructive dark:text-white group-hover:text-white group" />
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{inativo ? 'Reativar Item' : 'Desativar Item'}
					</DialogTitle>
				</DialogHeader>
				<p>
					{inativo
						? 'O item voltará a aparecer como ativo no inventário e poderá ser vinculado a chamados.'
						: 'O item ficará inativo e não aparecerá na abertura de novos chamados.'}
				</p>
				<AlertaMovimentacaoAtic
					localizacaoAtual={localizacaoAtual}
					servidorAtual={servidorAtual}
					acaoLabel={
						inativo
							? 'Ao reativar o item'
							: 'Ao desativar o item'
					}
				/>
				<div className="space-y-2">
					<Label htmlFor="motivo-inativar">Motivo da alteração *</Label>
					<textarea
						id="motivo-inativar"
						value={motivo}
						onChange={(e) => setMotivo(e.target.value)}
						placeholder="Descreva o motivo"
						rows={3}
						maxLength={2000}
						className={cn(
							'border-input placeholder:text-muted-foreground flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
							'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						)}
					/>
				</div>
				<DialogFooter>
					<div className="flex gap-2">
						<DialogClose asChild>
							<Button variant="outline">Voltar</Button>
						</DialogClose>
						<Button
							disabled={isPending}
							onClick={() => startTransition(() => handleAction())}
							type="button"
							variant={inativo ? 'default' : 'destructive'}
						>
							{isPending ? (
								<Loader2 className="animate-spin" />
							) : inativo ? (
								'Reativar'
							) : (
								'Desativar'
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
