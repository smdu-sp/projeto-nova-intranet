'use client';

import type { ReactNode } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertaMovimentacaoAtic } from './alerta-movimentacao-atic';

export default function ModalAlterarStatusItem({
	idbem,
	statusAtual,
	statusDestino,
	label,
	icon,
	localizacaoAtual,
	servidorAtual,
	variant = 'outline',
	className,
}: {
	idbem: number;
	statusAtual: string;
	statusDestino: string;
	label: string;
	icon: ReactNode;
	localizacaoAtual?: string;
	servidorAtual?: string;
	variant?: 'outline' | 'default' | 'destructive';
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const [motivo, setMotivo] = useState('');
	const [isPending, startTransition] = useTransition();

	async function handleConfirmar() {
		if (!motivo.trim()) {
			toast.error('Informe o motivo da alteração de status');
			return;
		}

		try {
			const res = await fetch(`/api/helpdesk/itens/${idbem}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					statusitem: statusDestino,
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
				toast.error('Erro ao alterar status', { description: message });
				return;
			}
		} catch {
			toast.error('Falha na comunicação com o servidor ao alterar status');
			return;
		}

		toast.success(
			`Status alterado para "${statusDestino}" e item movimentado para a ATIC`,
		);
		setOpen(false);
		setMotivo('');
		window.location.reload();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) setMotivo('');
			}}
		>
			<DialogTrigger asChild>
				<Button
					size="icon"
					variant={variant}
					title={label}
					className={cn(
						'h-8 w-8 shrink-0 cursor-pointer transition-all ease-linear duration-200',
						className,
					)}
				>
					{icon}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{label}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 text-sm">
					<p>
						Alterar status de <strong>{statusAtual}</strong> para{' '}
						<strong>{statusDestino}</strong>.
					</p>

					<AlertaMovimentacaoAtic
						localizacaoAtual={localizacaoAtual}
						servidorAtual={servidorAtual}
						acaoLabel="Ao confirmar esta alteração de status"
					/>

					<div className="space-y-2">
						<Label htmlFor={`motivo-status-${statusDestino}`}>
							Motivo da alteração *
						</Label>
						<textarea
							id={`motivo-status-${statusDestino}`}
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							placeholder="Descreva o motivo desta mudança de status"
							rows={3}
							maxLength={2000}
							className={cn(
								'border-input placeholder:text-muted-foreground flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
								'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
							)}
						/>
					</div>
				</div>
				<DialogFooter>
					<div className="flex gap-2">
						<DialogClose asChild>
							<Button variant="outline">Voltar</Button>
						</DialogClose>
						<Button
							disabled={isPending}
							onClick={() => startTransition(() => handleConfirmar())}
							type="button"
							variant={variant === 'destructive' ? 'destructive' : 'default'}
						>
							{isPending ? (
								<Loader2 className="animate-spin" />
							) : (
								'Confirmar e movimentar'
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
