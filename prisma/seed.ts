import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : undefined,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.usuario.upsert({
    where: { login: "d927014" },
    update: {
      email: "vmabreu@prefeitura.sp.gov.br",
      desenvolvedor: true,
      permissao: "DEV",
      nome: "Victor Alexander Menezes de Abreu",
    },
    create: {
      login: "d927014",
      nome: "Victor Alexander Menezes de Abreu",
      email: "vmabreu@prefeitura.sp.gov.br",
      desenvolvedor: true,
      permissao: "DEV",
    },
  });

  await prisma.permissao.createMany({
    data: [
      { 
        nome: "avaliacao_limpeza.avaliacoes.visualizar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.avaliacoes.criar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.avaliacoes.editar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.avaliacoes.excluir",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.categorias.visualizar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.categorias.criar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.categorias.editar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.categorias.excluir",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.criterios.visualizar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.criterios.criar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.criterios.editar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.criterios.excluir",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.salas.visualizar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.salas.criar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.salas.editar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.salas.excluir",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.usuarios.visualizar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.usuarios.criar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.usuarios.editar",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "avaliacao_limpeza.usuarios.excluir",
        modulo: "avaliacao_limpeza"
      },
      { 
        nome: "reserva_salas.reservas.visualizar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.reservas.criar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.reservas.editar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.reservas.excluir",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.salas_reserva.visualizar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.salas_reserva.criar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.salas_reserva.editar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.salas_reserva.excluir",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.agenda.visualizar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.agenda.criar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.agenda.editar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.agenda.excluir",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.usuarios.visualizar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.usuarios.criar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.usuarios.editar",
        modulo: "reserva_salas"
      },
      { 
        nome: "reserva_salas.usuarios.excluir",
        modulo: "reserva_salas"
      },
      {
        nome: "gestao_pessoas.modulo.visualizar",
        modulo: "gestao_pessoas",
        descricao: "Acesso ao módulo Gestão de Pessoas",
      },
      {
        nome: "gestao_pessoas.importacao.executar",
        modulo: "gestao_pessoas",
        descricao: "Importar carga mensal SIGPEG",
      },
      {
        nome: "gestao_pessoas.folha_ponto.imprimir",
        modulo: "gestao_pessoas",
        descricao: "Imprimir folha de frequência individual",
      },
      {
        nome: "gestao_pessoas.permissoes.gerenciar",
        modulo: "gestao_pessoas",
        descricao: "Gerenciar vínculos usuário-unidade",
      },
    ],
    skipDuplicates: true,
  });
  console.log("Seed: usuário x577988 (USR) criado/atualizado.");

  await prisma.usuario.upsert({
    where: { login: "teste.chamados" },
    update: {
      email: "teste.chamados@prefeitura.sp.gov.br",
      permissao: "USR",
      nome: "Usuário Teste Chamados",
      status: true,
    },
    create: {
      login: "teste.chamados",
      nome: "Usuário Teste Chamados",
      email: "teste.chamados@prefeitura.sp.gov.br",
      permissao: "USR",
      status: true,
    },
  });
  console.log("Seed: usuário teste.chamados (USR) criado/atualizado.");

  await prisma.usuario.upsert({
    where: { login: "d854440" },
    update: { permissao: "DEV", desenvolvedor: true },
    create: {
      login: "d854440",
      nome: "Bruno Luiz Vieira",
      email: "blv.bruno@gmail.com",
      permissao: "DEV",
      desenvolvedor: true,
      status: true,
    },
  });
  console.log("Seed: usuário d854440 (DEV) criado/atualizado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
