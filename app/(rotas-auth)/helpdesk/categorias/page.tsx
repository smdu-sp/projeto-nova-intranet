import { AcessoNegadoHelpdesk } from '@/app/(rotas-auth)/helpdesk/_components/acesso-negado-helpdesk';
import { GerenciarCategorias } from '@/app/(rotas-auth)/helpdesk/_components/gerenciar-categorias';
import { auth } from '@/lib/auth';
import { podeGerenciarCategoriasHelpdesk } from '@/lib/permissoes';

export default async function CategoriasHelpdeskPage() {
  const session = await auth();
  const permissao = (session as { usuario?: { permissao?: string } })?.usuario?.permissao ?? '';
  if (!podeGerenciarCategoriasHelpdesk(permissao)) {
    return (
      <AcessoNegadoHelpdesk mensagem="Somente administradores e supervisores podem gerenciar categorias de chamado." />
    );
  }
  return <GerenciarCategorias />;
}
