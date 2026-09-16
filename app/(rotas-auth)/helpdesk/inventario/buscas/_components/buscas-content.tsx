'use client';

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
	STATUS_SOLICITACAO_META,
	type StatusSolicitacao,
	type TipoAlvo,
} from '@/lib/inventario/buscas';
import { Loader2, Play, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

export type SolicitacaoRow = {
	id: number;
	alvo: string;
	tipoAlvo: TipoAlvo;
	status: StatusSolicitacao;
	resultado: string | null;
	processadoEm: string | null;
	criadoEm: string;
	solicitante: { id: string; nome: string } | null;
};

function fmt(iso: string | null) {
	return iso ? new Date(iso).toLocaleString('pt-BR') : '—';
}

export default function BuscasContent({ inicial }: { inicial: SolicitacaoRow[] }) {
	const [alvo, setAlvo] = useState('');
	const [tipoAlvo, setTipoAlvo] = useState<TipoAlvo>('host');
	const [isPending, startTransition] = useTransition();
	const [executando, setExecutando] = useState(false);

	async function executarFila() {
		setExecutando(true);
		try {
			const res = await fetch('/api/inventario/buscas/executar', { method: 'POST' });
			const data = await res.json();
			if (!res.ok) {
				toast.error('Não foi possível executar', { description: data.error });
				return;
			}
			toast.success(data.mensagem ?? 'Coletor disparado');
			// Dá um tempo para o coletor processar e recarrega para ver o resultado.
			setTimeout(() => window.location.reload(), 6000);
		} catch {
			toast.error('Falha na comunicação com o servidor');
		} finally {
			setExecutando(false);
		}
	}

	function solicitar() {
		if (!alvo.trim()) {
			toast.info('Informe o alvo');
			return;
		}
		startTransition(async () => {
			try {
				const res = await fetch('/api/inventario/buscas', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ alvo: alvo.trim(), tipoAlvo }),
				});
				const data = await res.json();
				if (!res.ok) {
					toast.error('Erro', { description: data.error });
					return;
				}
				toast.success('Busca solicitada — será executada na próxima varredura do coletor');
				window.location.reload();
			} catch {
				toast.error('Falha na comunicação com o servidor');
			}
		});
	}

	function cancelar(id: number) {
		startTransition(async () => {
			const res = await fetch(`/api/inventario/buscas/${id}`, { method: 'DELETE' });
			const data = await res.json();
			if (!res.ok) {
				toast.error('Erro', { description: data.error });
				return;
			}
			toast.success('Solicitação removida');
			window.location.reload();
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="rounded-xl border bg-card p-4">
				<h2 className="font-medium">Nova solicitação</h2>
				<p className="text-sm text-muted-foreground">
					Enfileira uma coleta e clique em <strong>Executar fila agora</strong>.
					Dica: use o alvo <code>localhost</code> para coletar o próprio servidor
					(teste sem depender de WinRM).
				</p>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<Select value={tipoAlvo} onValueChange={(v) => setTipoAlvo(v as TipoAlvo)}>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="host">Host</SelectItem>
							<SelectItem value="subrede">Sub-rede</SelectItem>
						</SelectContent>
					</Select>
					<Input
						placeholder={
							tipoAlvo === 'host' ? 'Hostname ou IP (ex.: PC-01 ou 10.75.32.10)' : 'CIDR /16 a /30 (ex.: 10.75.32.0/21)'
						}
						value={alvo}
						onChange={(e) => setAlvo(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && solicitar()}
						className="w-full sm:w-96"
					/>
					<Button onClick={solicitar} disabled={isPending}>
						{isPending ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
						Solicitar
					</Button>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Button onClick={executarFila} disabled={executando}>
					{executando ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
					Executar fila agora
				</Button>
				<Button variant="outline" onClick={() => window.location.reload()}>
					<RefreshCw size={16} /> Atualizar
				</Button>
				<span className="text-xs text-muted-foreground">
					Dispara o coletor no servidor para processar as solicitações pendentes.
				</span>
			</div>

			<div className="rounded-xl border overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="bg-primary text-white">
						<tr>
							<th className="px-3 py-2 text-left">Alvo</th>
							<th className="px-3 py-2 text-left">Tipo</th>
							<th className="px-3 py-2 text-center">Status</th>
							<th className="px-3 py-2 text-left">Solicitante</th>
							<th className="px-3 py-2 text-left">Criado</th>
							<th className="px-3 py-2 text-left">Processado</th>
							<th className="px-3 py-2 text-left">Resultado</th>
							<th className="px-3 py-2 text-center">Ações</th>
						</tr>
					</thead>
					<tbody>
						{inicial.length === 0 ? (
							<tr>
								<td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
									Nenhuma solicitação ainda.
								</td>
							</tr>
						) : (
							inicial.map((s) => {
								const meta = STATUS_SOLICITACAO_META[s.status];
								return (
									<tr key={s.id} className="border-t">
										<td className="px-3 py-2 font-medium">{s.alvo}</td>
										<td className="px-3 py-2">{s.tipoAlvo}</td>
										<td className="px-3 py-2 text-center">
											<span
												className="rounded-full px-2 py-0.5 text-xs font-medium"
												style={{ backgroundColor: meta.corBg, color: meta.corText }}
											>
												{meta.label}
											</span>
										</td>
										<td className="px-3 py-2">{s.solicitante?.nome ?? '—'}</td>
										<td className="px-3 py-2 whitespace-nowrap">{fmt(s.criadoEm)}</td>
										<td className="px-3 py-2 whitespace-nowrap">{fmt(s.processadoEm)}</td>
										<td className="px-3 py-2 max-w-xs truncate" title={s.resultado ?? ''}>
											{s.resultado ?? '—'}
										</td>
										<td className="px-3 py-2 text-center">
											{s.status === 'pendente' ? (
												<Button
													size="icon"
													variant="outline"
													onClick={() => cancelar(s.id)}
													disabled={isPending}
													title="Cancelar"
												>
													<Trash2 size={16} className="text-destructive" />
												</Button>
											) : (
												'—'
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
