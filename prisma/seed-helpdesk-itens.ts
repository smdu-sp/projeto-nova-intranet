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

const COMPUTADORES = [
  {
    patrimonio: "2024-001847",
    tipo: "Computador",
    descsbpm: "Desktop Dell OptiPlex 7090",
    numserie: "DL7090X12849",
    marca: "Dell",
    modelo: "OptiPlex 7090",
    cimbpm: "CIM-89421",
    nomeRede: "CAP-ASABOYA-001",
    statusitem: "Ativo",
  },
  {
    patrimonio: "2024-001848",
    tipo: "Computador",
    descsbpm: "Desktop Dell OptiPlex 7090",
    numserie: "DL7090X12850",
    marca: "Dell",
    modelo: "OptiPlex 7090",
    cimbpm: "CIM-89422",
    nomeRede: "CAP-ASABOYA-002",
    statusitem: "Ativo",
  },
  {
    patrimonio: "2022-007722",
    tipo: "Computador",
    descsbpm: "Desktop HP ProDesk 400 G6",
    numserie: "HP-PD400-32109",
    marca: "HP",
    modelo: "ProDesk 400 G6",
    cimbpm: "CIM-65422",
    nomeRede: "CONTRU-DINS-PC07",
    statusitem: "Ativo",
  },
  {
    patrimonio: "2022-007811",
    tipo: "Computador",
    descsbpm: "Desktop HP ProDesk 400 G6",
    numserie: "HP-PD400-32208",
    marca: "HP",
    modelo: "ProDesk 400 G6",
    cimbpm: "CIM-65512",
    nomeRede: "CASE-DCAD-PC03",
    statusitem: "Ativo",
  },
  {
    patrimonio: "2022-006501",
    tipo: "Computador",
    descsbpm: "Desktop Positivo Master D420",
    numserie: "PS-D420-21011",
    marca: "Positivo",
    modelo: "Master D420",
    cimbpm: "CIM-60112",
    nomeRede: "CASE-DDU-PC01",
    statusitem: "Ativo",
  },
] as const;

async function main() {
  const total = await prisma.hdItemPatrimonio.count();
  if (total > 0) {
    console.log(`Seed itens: já existem ${total} item(ns) — nada a fazer.`);
    return;
  }

  const unidade =
    (await prisma.hdUnidade.findFirst({ where: { ativo: true } })) ??
    (await prisma.hdUnidade.create({
      data: {
        nome: "Sem Entidade (GLPI)",
        raiz: "GLPI",
        sigla: "GLPI",
        codigo: "0",
        sala: "Sala administrativa",
        ativo: true,
      },
    }));

  for (const item of COMPUTADORES) {
    await prisma.hdItemPatrimonio.create({
      data: { ...item, unidadeId: unidade.id },
    });
  }

  console.log(`Seed itens: ${COMPUTADORES.length} computadores criados (unidade: ${unidade.nome}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
