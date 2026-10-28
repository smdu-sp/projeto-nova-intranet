/**
 * Povoa principal.usuarios e principal.coordenadorias a partir da tblUsuarios/tblUnidades
 * reais do SGU (SGU_DATABASE_URL).
 * Uso: npx tsx prisma/seed-usuarios-sgu.ts
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

/** Domínio usado para o e-mail de fallback quando o SGU não traz e-mail (mesma convenção do LDAP). */
const DOMINIO_EMAIL_FALLBACK = (process.env.LDAP_DOMAIN ?? "rede.sp").replace(/^@/, "");

type LinhaUsuarioSgu = {
  cpUsuarioRede: string | null;
  cpNome: string | null;
  cpNomeSocial: string | null;
  cpUnid: string | null;
};

type LinhaUnidadeSgu = {
  uid: string | null;
  sigla: string | null;
};

function limparTexto(valor: string | null): string {
  return (valor ?? "").replace(/[\r\n]/g, "").trim();
}

/** Primeiro segmento do caminho de siglas ("RESID/DRVE" -> "RESID"), usado como nome da coordenadoria. */
function raizDoSigla(siglaSgu: string): string {
  return limparTexto(siglaSgu.split("/")[0]);
}

async function buscarUnidadesSgu(): Promise<Map<string, string>> {
  const rows = await querySgu<LinhaUnidadeSgu>(
    "SELECT uid, sigla FROM tblUnidades WHERE uid IS NOT NULL AND uid <> ''"
  );
  const mapa = new Map<string, string>();
  for (const row of rows) {
    const uid = limparTexto(row.uid);
    const sigla = limparTexto(row.sigla);
    if (uid && sigla) mapa.set(uid, sigla);
  }
  return mapa;
}

async function buscarUsuariosSgu(): Promise<LinhaUsuarioSgu[]> {
  return querySgu<LinhaUsuarioSgu>(
    `SELECT cpUsuarioRede, cpNome, cpNomeSocial, cpUnid
     FROM tblUsuarios
     WHERE IFNULL(cpUltimaCarga,'') = 'X'`
  );
}

async function obterOuCriarCoordenadoria(
  nome: string,
  cache: Map<string, string>
): Promise<string> {
  const emCache = cache.get(nome);
  if (emCache) return emCache;

  const existente = await prisma.coordenadoria.findFirst({ where: { nome } });
  if (existente) {
    cache.set(nome, existente.id);
    return existente.id;
  }

  const criada = await prisma.coordenadoria.create({ data: { nome, ativo: true } });
  cache.set(nome, criada.id);
  return criada.id;
}

async function main() {
  if (!poolSguDisponivel()) {
    throw new Error("SGU_DATABASE_URL não configurado — não é possível ler a tblUsuarios.");
  }

  const unidadesPorUid = await buscarUnidadesSgu();
  const usuariosSgu = await buscarUsuariosSgu();
  if (usuariosSgu.length === 0) {
    throw new Error("Nenhum usuário retornado do SGU (verifique a conexão e a tblUsuarios).");
  }

  const cacheCoordenadoria = new Map<string, string>();

  let criados = 0;
  let atualizados = 0;
  let semCoordenadoria = 0;
  const erros: string[] = [];

  for (const row of usuariosSgu) {
    const login = limparTexto(row.cpUsuarioRede).toLowerCase();
    const nome = limparTexto(row.cpNome);
    if (!login || !nome) continue;

    const nomeSocial = limparTexto(row.cpNomeSocial) || null;
    const cpUnid = limparTexto(row.cpUnid);
    const siglaUnidade = cpUnid ? unidadesPorUid.get(cpUnid) : undefined;

    let coordenadoriaId: string | undefined;
    if (siglaUnidade) {
      const raiz = raizDoSigla(siglaUnidade);
      if (raiz) coordenadoriaId = await obterOuCriarCoordenadoria(raiz, cacheCoordenadoria);
    }
    if (!coordenadoriaId) semCoordenadoria++;

    try {
      const existente = await prisma.usuario.findUnique({
        where: { login },
        select: { id: true },
      });

      if (existente) {
        // Não sobrescreve e-mail/permissão: podem ter sido definidos via AD ou ajustados manualmente.
        await prisma.usuario.update({
          where: { id: existente.id },
          data: {
            nome,
            nomeSocial,
            status: true,
            ...(coordenadoriaId ? { coordenadoriaId } : {}),
          },
        });
        atualizados++;
      } else {
        await prisma.usuario.create({
          data: {
            login,
            nome,
            nomeSocial,
            email: `${login}@${DOMINIO_EMAIL_FALLBACK}`,
            permissao: "USR",
            status: true,
            ...(coordenadoriaId ? { coordenadoriaId } : {}),
          },
        });
        criados++;
      }
    } catch (e) {
      erros.push(`${login}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `Usuários do SGU: ${usuariosSgu.length} (${criados} novos, ${atualizados} atualizados, ${semCoordenadoria} sem coordenadoria resolvida).`
  );
  console.log(`Coordenadorias distintas usadas/criadas: ${cacheCoordenadoria.size}.`);
  if (erros.length > 0) {
    console.log(`Erros (${erros.length}):`);
    for (const e of erros.slice(0, 20)) console.log(" -", e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
