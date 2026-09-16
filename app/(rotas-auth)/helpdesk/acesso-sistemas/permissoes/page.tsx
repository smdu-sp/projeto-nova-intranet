import { AcessoNegadoHelpdesk } from '@/app/(rotas-auth)/helpdesk/_components/acesso-negado-helpdesk';
import { GerenciarPermissoesAcesso } from '@/app/(rotas-auth)/helpdesk/_components/acesso-sistemas/gerenciar-permissoes';
import { auth } from '@/lib/auth';
import { podeGerenciarAcessoSistemasHelpdesk } from '@/lib/permissoes';

export default async function PermissoesAcessoPage() {
  const session = await auth();
  const permissao = (session as { usuario?: { permissao?: string } })?.usuario?.permissao ?? '';
  if (!podeGerenciarAcessoSistemasHelpdesk(permissao)) {
    return (
      <AcessoNegadoHelpdesk mensagem="Somente administradores e supervisores podem gerenciar permissões de acesso a sistemas." />
    );
  }
  return <GerenciarPermissoesAcesso />;
}
