'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type UsuarioBuscaResult = {
	id: string;
	nome: string;
	login: string;
};

interface CampoBuscaUsuarioProps {
	value: string;
	onChange: (id: string) => void;
	onSelecionar?: (usuario: UsuarioBuscaResult) => void;
	nomeInicial?: string;
	placeholder?: string;
	/** Valor enviado ao formulário quando nenhuma pessoa está selecionada */
	vazioValue?: string;
	/** Exibe opção para limpar a seleção */
	permitirVazio?: boolean;
	labelVazio?: string;
	className?: string;
	/** Restringe a busca a usuários desta coordenadoria */
	coordenadoriaId?: string | null;
}

export function CampoBuscaUsuario({
	value,
	onChange,
	onSelecionar,
	nomeInicial,
	placeholder = 'Digite o nome da pessoa...',
	vazioValue = '',
	permitirVazio = false,
	labelVazio = 'Sem responsável',
	className,
	coordenadoriaId,
}: CampoBuscaUsuarioProps) {
	const selecionado = !!value && value !== vazioValue;
	const [query, setQuery] = useState(
		selecionado && nomeInicial ? nomeInicial : '',
	);
	const [resultados, setResultados] = useState<UsuarioBuscaResult[]>([]);
	const [aberto, setAberto] = useState(false);
	const [carregando, setCarregando] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (selecionado && nomeInicial) {
			setQuery(nomeInicial);
		} else if (!selecionado) {
			setQuery('');
		}
	}, [nomeInicial, selecionado, value]);

	useEffect(() => {
		function handler(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setAberto(false);
			}
		}
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	useEffect(() => {
		if (timer.current) clearTimeout(timer.current);

		if (query.trim().length < 2) {
			setResultados([]);
			setCarregando(false);
			return;
		}

		timer.current = setTimeout(async () => {
			setCarregando(true);
			try {
				const params = new URLSearchParams({ q: query.trim() });
				if (coordenadoriaId) params.set('coordenadoriaId', coordenadoriaId);
				const r = await fetch(`/api/usuarios/busca?${params.toString()}`);
				setResultados(r.ok ? await r.json() : []);
			} catch {
				setResultados([]);
			} finally {
				setCarregando(false);
			}
		}, 300);

		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, [query, coordenadoriaId]);

	function limpar() {
		onChange(vazioValue);
		setQuery('');
		setResultados([]);
		setAberto(false);
	}

	function selecionar(usuario: UsuarioBuscaResult) {
		onChange(usuario.id);
		onSelecionar?.(usuario);
		setQuery(usuario.nome);
		setResultados([]);
		setAberto(false);
	}

	const mostrarLista =
		aberto &&
		(carregando ||
			resultados.length > 0 ||
			(permitirVazio && query.trim().length < 2));

	return (
		<div ref={ref} className={cn('relative', className)}>
			<div className="relative">
				<Input
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						if (selecionado) onChange(vazioValue);
						setAberto(true);
					}}
					onFocus={() => setAberto(true)}
					placeholder={placeholder}
					autoComplete="off"
					className={selecionado ? 'pr-9' : undefined}
				/>
				{selecionado && (
					<button
						type="button"
						onClick={limpar}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						aria-label="Limpar seleção"
					>
						<X className="size-4" />
					</button>
				)}
			</div>

			{mostrarLista && (
				<div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
					{carregando && (
						<div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							Buscando...
						</div>
					)}
					{permitirVazio && query.trim().length < 2 && (
						<button
							type="button"
							onMouseDown={limpar}
							className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-muted"
						>
							{labelVazio}
						</button>
					)}
					{resultados.map((usuario) => (
						<button
							key={usuario.id}
							type="button"
							onMouseDown={() => selecionar(usuario)}
							className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
						>
							<span className="font-medium">{usuario.nome}</span>
							<span className="ml-1 text-muted-foreground">
								({usuario.login})
							</span>
						</button>
					))}
					{!carregando &&
						query.trim().length >= 2 &&
						resultados.length === 0 && (
							<div className="px-3 py-2 text-sm text-muted-foreground">
								Nenhuma pessoa encontrada
							</div>
						)}
				</div>
			)}
		</div>
	);
}
