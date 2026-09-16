import { FormSolicitacaoAcesso } from '@/app/(rotas-auth)/helpdesk/_components/acesso-sistemas/form-solicitacao-acesso';
import { verificarAcessoPaginaHelpdesk } from '@/lib/helpdesk/verificar-acesso-pagina';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function NovoAcessoSistemasPage() {
  await verificarAcessoPaginaHelpdesk('chamados');
  const session = await auth();
  const login = (session as { usuario?: { login?: string } })?.usuario?.login;
  if (!login) redirect('/login');

  const usuario = await prisma.usuario.findFirst({
    where: { login, status: true },
    select: { id: true, nome: true, login: true, email: true },
  });
  if (!usuario) redirect('/login');

  return <FormSolicitacaoAcesso usuarioLogado={usuario} />;
}
