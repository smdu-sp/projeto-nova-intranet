/**
 * Insere coordenadorias (principal) e unidades help desk mockadas.
 * Uso: npx tsx prisma/seed-mock-unidades-coordenadorias.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated";
import {
  buildCoordenadoriasMock,
  buildUnidadesMock,
} from "../lib/helpdesk/mock-dados";

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

async function seedCoordenadorias() {
  const nomes = buildCoordenadoriasMock();
  let criadas = 0;
  let atualizadas = 0;

  for (const nome of nomes) {
    const existente = await prisma.coordenadoria.findFirst({ where: { nome } });
    if (existente) {
      await prisma.coordenadoria.update({
        where: { id: existente.id },
        data: { ativo: true },
      });
      atualizadas++;
    } else {
      await prisma.coordenadoria.create({ data: { nome, ativo: true } });
      criadas++;
    }
  }

  return { total: nomes.length, criadas, atualizadas };
}

async function seedUnidadesHelpdesk() {
  const unidades = buildUnidadesMock();
  let criadas = 0;
  let atualizadas = 0;

  for (const u of unidades) {
    const antes = await prisma.hdUnidade.findUnique({ where: { codigo: u.codigo } });
    await prisma.hdUnidade.upsert({
      where: { codigo: u.codigo },
      create: {
        codigo: u.codigo,
        nome: u.nome,
        raiz: u.raiz,
        sigla: u.sigla,
        sala: u.sala,
        ativo: true,
      },
      update: {
        nome: u.nome,
        raiz: u.raiz,
        sigla: u.sigla,
        sala: u.sala,
        ativo: true,
      },
    });
    if (antes) atualizadas++;
    else criadas++;
  }

  return { total: unidades.length, criadas, atualizadas };
}

async function main() {
  const coord = await seedCoordenadorias();
  const und = await seedUnidadesHelpdesk();

  console.log(
    `Coordenadorias: ${coord.total} (${coord.criadas} novas, ${coord.atualizadas} já existiam e foram reativadas).`
  );
  console.log(
    `Unidades HD: ${und.total} (${und.criadas} novas, ${und.atualizadas} atualizadas).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
