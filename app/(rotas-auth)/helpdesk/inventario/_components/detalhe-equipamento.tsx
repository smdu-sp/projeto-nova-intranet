'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	METODO_COLETA_LABEL,
	STATUS_REDE_META,
	TIPO_EQUIPAMENTO_LABEL,
} from '@/lib/inventario/equipamento';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { EquipamentoDetalhe } from './detalhe-tipos';
import QrEquipamento from './qr-equipamento';
import VincularPatrimonio from './vincular-patrimonio';

type Aba = 'geral' | 'hardware' | 'software' | 'historico' | 'localizacao' | 'alertas';

function fmtData(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleString('pt-BR');
}

function fmtMb(mb: number | null): string {
	if (mb === null || mb === undefined) return '—';
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	return `${mb} MB`;
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
	return (
		<div>
			<p className="text-xs uppercase text-muted-foreground">{label}</p>
			<p className="font-medium">{valor || '—'}</p>
		</div>
	);
}

export default function DetalheEquipamento({ eq }: { eq: EquipamentoDetalhe }) {
	const [aba, setAba] = useState<Aba>('geral');
	const meta = STATUS_REDE_META[eq.statusRede];
	const titulo = eq.hostname || eq.nome || `Equipamento #${eq.id}`;

	const abas: { id: Aba; label: string; badge?: number }[] = [
		{ id: 'geral', label: 'Geral' },
		{ id: 'hardware', label: 'Hardware' },
		{ id: 'software', label: 'Software', badge: eq.softwares.length },
		{ id: 'historico', label: 'Histórico', badge: eq.historico.length },
		{ id: 'localizacao', label: 'Localização' },
		{ id: 'alertas', label: 'Alertas', badge: eq.alertas.length },
	];

	return (
		<div className="w-full px-0 md:px-8 pb-20 md:pb-14 md:container mx-auto">
			<Link
				href="/helpdesk/inventario/equipamentos"
				className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft size={16} /> Voltar aos equipamentos
			</Link>

			<div className="mt-3 flex flex-wrap items-center gap-3">
				<h1 className="text-2xl md:text-4xl font-bold">{titulo}</h1>
				<span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
					{TIPO_EQUIPAMENTO_LABEL[eq.tipo]}
				</span>
				<span
					className="rounded-full px-3 py-1 text-sm font-medium"
					style={{ backgroundColor: meta.corBg, color: meta.corText }}
				>
					{meta.label}
				</span>
			</div>

			<div className="mt-5 flex flex-wrap gap-2 border-b">
				{abas.map((a) => (
					<button
						key={a.id}
						onClick={() => setAba(a.id)}
						className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
							aba === a.id
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						}`}
					>
						{a.label}
						{a.badge ? (
							<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
								{a.badge}
							</span>
						) : null}
					</button>
				))}
			</div>

			<div className="mt-5">
				{aba === 'geral' && (
					<div className="flex flex-col gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Identificação e rede</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<Campo label="Hostname" valor={eq.hostname} />
								<Campo label="Nome" valor={eq.nome} />
								<Campo label="IP" valor={eq.ip} />
								<Campo label="MAC" valor={eq.mac} />
								<Campo label="Fabricante" valor={eq.fabricante} />
								<Campo label="Modelo" valor={eq.modelo} />
								<Campo label="Nº de série" valor={eq.numserie} />
								<Campo label="Sistema operacional" valor={eq.so} />
								<Campo label="Versão / Build" valor={[eq.soVersao, eq.soBuild].filter(Boolean).join(' / ')} />
								<Campo label="Usuário logado" valor={eq.usuarioLogado} />
								<Campo label="Domínio" valor={eq.dominio} />
								<Campo label="Unidade" valor={eq.unidade?.nome} />
								<Campo label="Responsável" valor={eq.servidor?.nome} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Coleta</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<Campo
									label="Método"
									valor={eq.metodoColeta ? METODO_COLETA_LABEL[eq.metodoColeta] : '—'}
								/>
								<Campo label="Último contato" valor={fmtData(eq.ultimoContato)} />
								<Campo label="Última coleta" valor={fmtData(eq.ultimaColeta)} />
								<Campo label="Cadastrado em" valor={fmtData(eq.criadoEm)} />
							</CardContent>
						</Card>

						<div className="grid gap-4 md:grid-cols-3">
							<Card className="md:col-span-2">
								<CardHeader>
									<CardTitle>Patrimônio vinculado</CardTitle>
								</CardHeader>
								<CardContent>
									<VincularPatrimonio equipamentoId={eq.id} item={eq.item} />
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>QR Code</CardTitle>
								</CardHeader>
								<CardContent>
									<QrEquipamento equipamentoId={eq.id} titulo={titulo} />
								</CardContent>
							</Card>
						</div>
					</div>
				)}

				{aba === 'hardware' && (
					<div className="flex flex-col gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Componentes</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
								<Campo label="Processador" valor={eq.hardware?.cpuModelo} />
								<Campo label="Núcleos" valor={eq.hardware?.cpuNucleos} />
								<Campo label="Memória RAM" valor={fmtMb(eq.hardware?.ramTotalMb ?? null)} />
								<Campo label="Placa-mãe" valor={eq.hardware?.placaMae} />
								<Campo label="BIOS" valor={eq.hardware?.bios} />
								<Campo label="Placa de vídeo" valor={eq.hardware?.placaVideo} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Discos ({eq.discos.length})</CardTitle>
							</CardHeader>
							<CardContent>
								{eq.discos.length === 0 ? (
									<p className="text-sm text-muted-foreground">Nenhum disco registrado.</p>
								) : (
									<div className="flex flex-col gap-2">
										{eq.discos.map((d) => (
											<div key={d.id} className="flex justify-between border-b pb-2 text-sm">
												<span className="flex flex-col">
													<span className="flex items-center gap-2">
														{d.modelo ?? 'Disco'}
														{d.tipoMidia ? (
															<span
																className={`rounded-full px-2 py-0.5 text-xs font-medium ${
																	d.tipoMidia === 'SSD'
																		? 'bg-emerald-100 text-emerald-800'
																		: d.tipoMidia === 'HDD'
																			? 'bg-amber-100 text-amber-800'
																			: 'bg-muted text-muted-foreground'
																}`}
															>
																{d.tipoMidia}
															</span>
														) : null}
													</span>
													{d.modeloFisico ? (
														<span className="text-xs text-muted-foreground">{d.modeloFisico}</span>
													) : null}
												</span>
												<span className="text-muted-foreground">
													{fmtMb(d.livreMb)} livre de {fmtMb(d.tamanhoMb)}
												</span>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}

				{aba === 'software' && (
					<Card>
						<CardHeader>
							<CardTitle>Softwares instalados ({eq.softwares.length})</CardTitle>
						</CardHeader>
						<CardContent>
							{eq.softwares.length === 0 ? (
								<p className="text-sm text-muted-foreground">Nenhum software registrado.</p>
							) : (
								<div className="flex flex-col gap-1">
									{eq.softwares.map((s) => (
										<div key={s.id} className="flex justify-between border-b py-1.5 text-sm">
											<span className={s.proibido ? 'text-destructive font-medium' : ''}>
												{s.nome}
												{s.proibido ? ' (proibido)' : ''}
											</span>
											<span className="text-muted-foreground">
												{[s.fabricante, s.versao].filter(Boolean).join(' · ') || '—'}
											</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{aba === 'historico' && (
					<Card>
						<CardHeader>
							<CardTitle>Histórico de alterações</CardTitle>
						</CardHeader>
						<CardContent>
							{eq.historico.length === 0 ? (
								<p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
							) : (
								<div className="flex flex-col gap-2">
									{eq.historico.map((h) => (
										<div key={h.id} className="border-b pb-2 text-sm">
											<div className="flex justify-between">
												<span className="font-medium">{h.campo}</span>
												<span className="text-xs text-muted-foreground">
													{fmtData(h.criadoEm)} · {METODO_COLETA_LABEL[h.origem]}
												</span>
											</div>
											<p className="text-muted-foreground">
												{h.valorAnterior ?? '(vazio)'} → {h.valorNovo ?? '(vazio)'}
											</p>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{aba === 'localizacao' && (
					<Card>
						<CardHeader>
							<CardTitle>Localização física</CardTitle>
						</CardHeader>
						<CardContent>
							{eq.localizacoes.length === 0 ? (
								<p className="text-sm text-muted-foreground">Nenhuma localização registrada.</p>
							) : (
								<div className="flex flex-col gap-2">
									{eq.localizacoes.map((l) => (
										<div key={l.id} className="flex justify-between border-b pb-2 text-sm">
											<span>
												{[l.predio, l.andar, l.sala, l.mesa].filter(Boolean).join(' · ') || '—'}
												{l.atual ? (
													<span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
														atual
													</span>
												) : null}
											</span>
											<span className="text-xs text-muted-foreground">{fmtData(l.criadoEm)}</span>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{aba === 'alertas' && (
					<Card>
						<CardHeader>
							<CardTitle>Alertas em aberto ({eq.alertas.length})</CardTitle>
						</CardHeader>
						<CardContent>
							{eq.alertas.length === 0 ? (
								<p className="text-sm text-muted-foreground">Nenhum alerta em aberto.</p>
							) : (
								<div className="flex flex-col gap-2">
									{eq.alertas.map((a) => (
										<div key={a.id} className="flex items-start gap-2 border-b pb-2 text-sm">
											<AlertTriangle size={16} className="mt-0.5 text-amber-500 shrink-0" />
											<div>
												<p className="font-medium">{a.tipo}</p>
												<p className="text-muted-foreground">{a.mensagem}</p>
												<p className="text-xs text-muted-foreground">{fmtData(a.criadoEm)}</p>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
