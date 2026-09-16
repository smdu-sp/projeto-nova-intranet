import DataTable, { TableSkeleton } from '@/components/data-table';
import { AcessoNegadoHelpdesk } from '@/app/(rotas-auth)/helpdesk/_components/acesso-negado-helpdesk';
import { auth } from '@/lib/auth';
import { podeGerenciarUnidadesHelpdesk } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import { columns } from './_components/columns';
import ModalUpdateAndCreate from './_components/modal-update-create';

export default async function UnidadesHelpdeskPage() {
	const session = await auth();
	const usuario = (session as { usuario?: { permissao?: string } })?.usuario;
	const permissao = usuario?.permissao ?? '';

	if (!session) {
		return (
			<div className="w-full px-0 md:px-8 pb-20 md:pb-14">
				<p>Você precisa estar autenticado.</p>
			</div>
		);
	}

	if (!podeGerenciarUnidadesHelpdesk(permissao)) {
		return (
			<AcessoNegadoHelpdesk mensagem="Somente administradores e supervisores de suporte podem gerenciar unidades do help desk." />
		);
	}

	return (
		<Suspense fallback={<TableSkeleton />}>
			<UnidadesContent />
		</Suspense>
	);
}

async function UnidadesContent() {
	const lista = await prisma.hdUnidade.findMany({
		orderBy: [{ raiz: 'asc' }, { nome: 'asc' }],
		select: {
			id: true,
			codigo: true,
			nome: true,
			raiz: true,
			sigla: true,
			sala: true,
			ativo: true,
		},
	});

	return (
		<div className="w-full px-0 md:px-8 relative pb-20 md:pb-14 h-full md:container mx-auto">
			<h1 className="text-xl md:text-4xl font-bold">Unidades</h1>
			<p className="text-sm text-muted-foreground mt-1">
				Cadastre unidades de atendimento do help desk. O campo sala é usado na abertura de chamados.
			</p>
			<div className="flex flex-col max-w-sm mx-auto md:max-w-full gap-3 my-5 w-full">
				<DataTable columns={columns} data={lista} />
			</div>
			<div className="absolute bottom-10 md:bottom-5 right-2 md:right-8 hover:scale-110">
				<ModalUpdateAndCreate isUpdating={false} />
			</div>
		</div>
	);
}
