import { AcessoNegadoHelpdesk } from '@/app/(rotas-auth)/helpdesk/_components/acesso-negado-helpdesk';
import { GerenciarPontosFocais } from '@/app/(rotas-auth)/helpdesk/_components/acesso-sistemas/gerenciar-pontos-focais';
import { auth } from '@/lib/auth';
import { podeGerenciarAcessoSistemasHelpdesk } from '@/lib/permissoes';

export default async function PontosFocaisPage() {
  const session = await auth();
  const permissao = (session as { usuario?: { permissao?: string } })?.usuario?.permissao ?? '';
  if (!podeGerenciarAcessoSistemasHelpdesk(permissao)) {
    return (
      <AcessoNegadoHelpdesk mensagem="Somente administradores e supervisores podem gerenciar pontos focais." />
    );
  }
  return <GerenciarPontosFocais />;
}
