import mariadb from "mariadb";

type GlobalComPoolSisgp = typeof globalThis & {
  __sisgpPool?: mariadb.Pool;
};

function parseSisgpUrl(raw: string) {
  const cleaned = raw.replace(/^mysql:\/\//, "http://");
  const u = new URL(cleaned);
  return {
    host: u.hostname,
    port: parseInt(u.port, 10) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    connectionLimit: 3,
    connectTimeout: 10000,
  };
}

export function poolSisgpDisponivel(): boolean {
  return !!process.env.SISGP_DATABASE_URL?.trim();
}

export function getPoolSisgp(): mariadb.Pool | null {
  const raw = process.env.SISGP_DATABASE_URL?.trim();
  if (!raw) return null;

  const g = globalThis as GlobalComPoolSisgp;
  if (!g.__sisgpPool) {
    g.__sisgpPool = mariadb.createPool(parseSisgpUrl(raw));
  }
  return g.__sisgpPool;
}

export async function querySisgp<T extends mariadb.RowDataPacket>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPoolSisgp();
  if (!pool) return [];
  try {
    return (await pool.query(sql, params)) as T[];
  } catch (err) {
    console.error("[sisgp] Erro na consulta:", err);
    return [];
  }
}
