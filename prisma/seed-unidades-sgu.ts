/**
 * Povoa hd.unidades a partir da tblUnidades real do SGU (SGU_DATABASE_URL).
 * Uso: npx tsx prisma/seed-unidades-sgu.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated";
import { poolSguDisponivel, querySgu } from "../lib/sgu/client";

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

/** Unidades que existem no Helpdesk mas não têm correspondência na tblUnidades do SGU. */
const EXTRAS_SEM_SGU = [
  { codigo: "HD-AUDITORIO", nome: "AUDITÓRIO" },
  { codigo: "HD-CGPATRI", nome: "CGPATRI" },
];

type LinhaSgu = {
  uid: string | null;
  sigla: string | null;
};

type UnidadeParaSincronizar = {
  codigo: string;
  nome: string;
  raiz: string;
  sigla: string;
};

function limparTexto(valor: string | null): string {
  return (valor ?? "").replace(/[\r\n]/g, "").trim();
}

/** Converte o caminho de siglas do SGU ("RESID/DRVE") para o padrão do app ("RESID > DRVE"). */
function montarNomeHierarquico(siglaSgu: string): string {
  return siglaSgu
    .split("/")
    .map((parte) => parte.trim())
    .filter(Boolean)
    .join(" > ");
}

async function buscarUnidadesSgu(): Promise<UnidadeParaSincronizar[]> {
  const rows = await querySgu<LinhaSgu>(
    "SELECT uid, sigla FROM tblUnidades WHERE uid IS NOT NULL AND uid <> '' ORDER BY uid"
  );

  const unidades: UnidadeParaSincronizar[] = [];
  for (const row of rows) {
    const codigo = limparTexto(row.uid);
    const siglaSgu = limparTexto(row.sigla);
    if (!codigo || !siglaSgu) continue;

    const nome = montarNomeHierarquico(siglaSgu);
    const partes = nome.split(" > ");
    unidades.push({
      codigo,
      nome,
      raiz: partes[0].slice(0, 100),
      sigla: partes[partes.length - 1].slice(0, 100),
    });
  }
  return unidades;
}

/** Linhas antigas do seed mock (codigo "UND-XXX") disponíveis para reaproveitar id/sala pelo nome. */
async function buscarLegadoMockPorNome(): Promise<Map<string, { id: string }>> {
  const legado = await prisma.hdUnidade.findMany({
    where: { codigo: { startsWith: "UND-" } },
    select: { id: true, nome: true },
  });
  const mapa = new Map<string, { id: string }>();
  for (const row of legado) {
    if (!mapa.has(row.nome)) mapa.set(row.nome, { id: row.id });
  }
  return mapa;
}

async function main() {
  if (!poolSguDisponivel()) {
    throw new Error("SGU_DATABASE_URL não configurado — não é possível ler a tblUnidades.");
  }

  const unidadesSgu = await buscarUnidadesSgu();
  if (unidadesSgu.length === 0) {
    throw new Error("Nenhuma unidade retornada do SGU (verifique a conexão e a tblUnidades).");
  }

  const legadoPorNome = await buscarLegadoMockPorNome();

  let criadas = 0;
  let atualizadas = 0;
  let reaproveitadas = 0;

  for (const u of unidadesSgu) {
    const legado = legadoPorNome.get(u.nome);
    if (legado) {
      // Reaproveita a linha mock (mesmo id/sala), só substitui o código fictício pelo código EH real.
      await prisma.hdUnidade.update({
        where: { id: legado.id },
        data: { codigo: u.codigo, nome: u.nome, raiz: u.raiz, sigla: u.sigla, ativo: true },
      });
      legadoPorNome.delete(u.nome);
      reaproveitadas++;
      continue;
    }

    const existente = await prisma.hdUnidade.findUnique({ where: { codigo: u.codigo } });
    await prisma.hdUnidade.upsert({
      where: { codigo: u.codigo },
      create: { codigo: u.codigo, nome: u.nome, raiz: u.raiz, sigla: u.sigla, ativo: true },
      update: { nome: u.nome, raiz: u.raiz, sigla: u.sigla, ativo: true },
    });
    if (existente) atualizadas++;
    else criadas++;
  }

  for (const extra of EXTRAS_SEM_SGU) {
    await prisma.hdUnidade.upsert({
      where: { codigo: extra.codigo },
      create: { codigo: extra.codigo, nome: extra.nome, raiz: extra.nome, sigla: extra.nome, ativo: true },
      update: {},
    });
  }

  console.log(
    `Unidades do SGU: ${unidadesSgu.length} (${criadas} novas, ${atualizadas} atualizadas por código, ${reaproveitadas} reaproveitadas do seed mock).`
  );
  console.log(`Extras sem correspondência no SGU mantidas: ${EXTRAS_SEM_SGU.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
