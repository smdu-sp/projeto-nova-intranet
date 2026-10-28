/**
 * Seed opcional: permissões de Gestão de Pessoas para o desenvolvedor e unidade DGP.
 * Executar: npx tsx prisma/seed-gestao-pessoas.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated";
import { GP_EH_DGP, GP_PERMISSOES } from "../lib/gestao-pessoas/constants";

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

const PERMISSOES_GP = Object.values(GP_PERMISSOES);

async function main() {
  await prisma.permissao.createMany({
    data: PERMISSOES_GP.map((nome) => ({
      nome,
      modulo: "gestao_pessoas" as const,
    })),
    skipDuplicates: true,
  });

  const permissoes = await prisma.permissao.findMany({
    where: { nome: { in: PERMISSOES_GP } },
  });

  const dev = await prisma.usuario.findFirst({
    where: { desenvolvedor: true },
  });
  if (dev) {
    for (const p of permissoes) {
      await prisma.usuarioPermissao.upsert({
        where: {
          usuarioId_permissaoId: { usuarioId: dev.id, permissaoId: p.id },
        },
        create: { usuarioId: dev.id, permissaoId: p.id },
        update: {},
      });
    }
    console.log(`Permissões GP atribuídas a ${dev.login}`);
  }

  await prisma.gpUnidade.upsert({
    where: { codigoEh: GP_EH_DGP },
    create: {
      codigoEh: GP_EH_DGP,
      prefixoEh: GP_EH_DGP.slice(0, 6),
      nome: "DIVISAO DE GESTAO DE PESSOAS",
    },
    update: {
      nome: "DIVISAO DE GESTAO DE PESSOAS",
    },
  });

  const unidadeDgp = await prisma.gpUnidade.findUnique({
    where: { codigoEh: GP_EH_DGP },
  });

  if (dev && unidadeDgp) {
    await prisma.gpUsuarioUnidade.upsert({
      where: {
        usuarioId_unidadeId: { usuarioId: dev.id, unidadeId: unidadeDgp.id },
      },
      create: {
        usuarioId: dev.id,
        unidadeId: unidadeDgp.id,
        papel: "dgp",
      },
      update: { papel: "dgp" },
    });
    console.log("Vínculo DGP configurado para desenvolvedor.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
