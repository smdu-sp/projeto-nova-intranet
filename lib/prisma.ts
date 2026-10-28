import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../prisma/generated";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : undefined,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

function createPrismaClient() {
  return new PrismaClient({ adapter });
}

/** Após `prisma generate`, o hot reload do Next pode manter um client antigo sem os modelos do helpdesk. */
function isPrismaClientAtual(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && typeof client.hdChamado?.findMany === "function");
}

function getPrismaClient(): PrismaClient {
  if (isPrismaClientAtual(globalForPrisma.prisma)) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
