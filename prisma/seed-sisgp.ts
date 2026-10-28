import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "./generated"
import { readFileSync } from "fs"
import { join } from "path"

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : undefined,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
})
const prisma = new PrismaClient({ adapter })

const SQL_FILE = join(process.cwd(), "public/Banco de dados/sisgp.sql")

// ─────────────────────────────────────────────────────────────────────────────
// Parser de MySQL INSERT
// ─────────────────────────────────────────────────────────────────────────────

function extractTableData(
  sql: string,
  tableName: string
): { columns: string[]; rows: (string | number | null)[][] } {
  const marker = `INSERT INTO \`${tableName}\``
  const idx = sql.indexOf(marker)
  if (idx === -1) return { columns: [], rows: [] }

  const headerStart = idx + marker.length
  const p1 = sql.indexOf("(", headerStart)
  const p2 = sql.indexOf(")", headerStart)
  const columns = sql
    .slice(p1 + 1, p2)
    .split(",")
    .map((c) => c.trim().replace(/`/g, ""))

  const valuesIdx = sql.indexOf("VALUES", headerStart)

  // encontrar fim do INSERT (ponto-e-vírgula fora de string)
  let i = valuesIdx + 6
  let inStr = false
  let endIdx = i
  while (i < sql.length) {
    const ch = sql[i]
    if (!inStr) {
      if (ch === "'") inStr = true
      else if (ch === ";") {
        endIdx = i
        break
      }
    } else {
      if (ch === "\\") i++
      else if (ch === "'") inStr = false
    }
    i++
  }

  const valuesSql = sql.slice(valuesIdx + 6, endIdx).trim()
  return { columns, rows: parseRows(valuesSql) }
}

function parseRows(src: string): (string | number | null)[][] {
  const rows: (string | number | null)[][] = []
  let i = 0
  const n = src.length

  while (i < n) {
    while (i < n && src[i] !== "(") i++
    if (i >= n) break
    i++

    const row: (string | number | null)[] = []

    while (i < n && src[i] !== ")") {
      while (i < n && " \t\r\n".includes(src[i])) i++
      if (src[i] === ")") break

      if (src[i] === "'") {
        i++
        let s = ""
        while (i < n) {
          if (src[i] === "\\" && i + 1 < n) {
            i++
            const e = src[i]
            if (e === "n") s += "\n"
            else if (e === "r") s += "\r"
            else if (e === "t") s += "\t"
            else s += e
            i++
          } else if (src[i] === "'") {
            i++
            if (i < n && src[i] === "'") {
              s += "'"
              i++
            } else break
          } else {
            s += src[i++]
          }
        }
        row.push(s)
      } else if (src.slice(i, i + 4).toUpperCase() === "NULL") {
        row.push(null)
        i += 4
      } else {
        let num = ""
        while (
          i < n &&
          src[i] !== "," &&
          src[i] !== ")" &&
          !" \t\r\n".includes(src[i])
        ) {
          num += src[i++]
        }
        if (num === "") {
          row.push(null)
        } else {
          const n2 = Number(num)
          row.push(isNaN(n2) ? num : n2)
        }
      }

      while (i < n && " \t\r\n".includes(src[i])) i++
      if (i < n && src[i] === ",") i++
    }

    if (i < n && src[i] === ")") i++
    rows.push(row)
  }

  return rows
}

function toObj(
  cols: string[],
  row: (string | number | null)[]
): Record<string, string | number | null> {
  const o: Record<string, string | number | null> = {}
  cols.forEach((c, idx) => {
    o[c] = row[idx] ?? null
  })
  return o
}

function nullStr(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function fallStr(v: string | number | null | undefined, fb = ""): string {
  return nullStr(v) ?? fb
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Lendo arquivo SISGP...")
  const sql = readFileSync(SQL_FILE, "utf-8")

  // ── 1. UNIDADES ─────────────────────────────────────────────────────────────
  console.log("\n[1/3] Importando unidades...")
  const { columns: uCols, rows: uRows } = extractTableData(sql, "unidades")
  console.log(`  ${uRows.length} unidades encontradas no SISGP.`)

  const siglaToUuidMap = new Map<string, string>()

  for (const row of uRows) {
    const u = toObj(uCols, row)
    const sigla = fallStr(u.sigla)
    if (!sigla) continue

    // Se já existe HdUnidade com essa sigla, aproveitar
    const existing = await prisma.hdUnidade.findFirst({ where: { sigla } })
    if (existing) {
      siglaToUuidMap.set(sigla, existing.id)
      continue
    }

    const nome = fallStr(u.unidades, sigla).slice(0, 200)
    const raiz = sigla.includes("/") ? sigla.split("/")[0] : sigla
    const statusRaw = fallStr(u.statusunidade, "ATIVO").toUpperCase()
    const ativo = statusRaw !== "INATIVO"

    // Codigo único: usa o id inteiro do SISGP (garantidamente único)
    const codigoBase = String(u.id)
    const codigoExiste = await prisma.hdUnidade.findUnique({
      where: { codigo: codigoBase },
    })
    const codigo = codigoExiste
      ? `${codigoBase}x`.slice(0, 20)
      : codigoBase.slice(0, 20)

    const criada = await prisma.hdUnidade.create({
      data: { codigo, nome, raiz: raiz.slice(0, 100), sigla: sigla.slice(0, 100), ativo },
    })
    siglaToUuidMap.set(sigla, criada.id)
  }

  console.log(`  ${siglaToUuidMap.size} unidades mapeadas.`)

  function resolveUnidade(loc: string | null): string | null {
    if (!loc) return null
    const locTrim = loc.trim()
    if (siglaToUuidMap.has(locTrim)) return siglaToUuidMap.get(locTrim)!
    // busca prefixo (ex: "ATIC ESTOQUE" contém "ATIC")
    for (const [sigla, id] of siglaToUuidMap) {
      if (locTrim.toUpperCase() === sigla.toUpperCase()) return id
    }
    return null
  }

  // ── 2. ITENS PATRIMÔNIO ──────────────────────────────────────────────────────
  console.log("\n[2/3] Importando itens de patrimônio...")
  const { columns: iCols, rows: iRows } = extractTableData(sql, "item")
  console.log(`  ${iRows.length} itens encontrados.`)

  const BATCH = 200
  let totalOk = 0

  for (let b = 0; b < iRows.length; b += BATCH) {
    const slice = iRows.slice(b, b + BATCH)
    const data = slice.map((row) => {
      const o = toObj(iCols, row)
      const localizacao = nullStr(o.localizacao)
      return {
        idbem: Number(o.idbem),
        patrimonio: nullStr(o.patrimonio),
        tipo: nullStr(o.tipo),
        descsbpm: nullStr(o.descsbpm),
        numserie: nullStr(o.numserie),
        tiposbpm: nullStr(o.tiposbpm),
        marca: nullStr(o.marca),
        modelo: nullStr(o.modelo),
        localizacao,
        numprocesso: nullStr(o.numprocesso),
        cimbpm: nullStr(o.cimbpm),
        nomeRede: nullStr(o.nome),
        statusitem: fallStr(o.statusitem, "Ativo").slice(0, 50),
        excluido: Number(o.excluido) === 1,
        unidadeId: resolveUnidade(localizacao),
      }
    })

    const result = await prisma.hdItemPatrimonio.createMany({
      data,
      skipDuplicates: true,
    })
    totalOk += result.count
    process.stdout.write(`  ${b + slice.length}/${iRows.length}\r`)
  }
  console.log(`\n  ${totalOk} itens importados (${iRows.length - totalOk} duplicatas ignoradas).`)

  // ── 3. TRANSFERÊNCIAS ────────────────────────────────────────────────────────
  console.log("\n[3/3] Importando transferências...")
  const { columns: tCols, rows: tRows } = extractTableData(sql, "transferencia")
  console.log(`  ${tRows.length} registros encontrados.`)

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, login: true },
  })
  const loginMap = new Map(usuarios.map((u) => [u.login.toLowerCase(), u.id]))

  let transferOk = 0
  let transferIgn = 0

  for (const row of tRows) {
    const o = toObj(tCols, row)

    const idUnidadeDestino = resolveUnidade(nullStr(o.localnovo))
    if (!idUnidadeDestino) { transferIgn++; continue }

    const loginRaw = fallStr(o.idusuario).toLowerCase()
    const idUsuarioRegistro = loginMap.get(loginRaw)
    if (!idUsuarioRegistro) { transferIgn++; continue }

    const idItemRaw = o.iditem !== null ? Number(o.iditem) : null
    if (!idItemRaw) { transferIgn++; continue }

    const itemExiste = await prisma.hdItemPatrimonio.findUnique({
      where: { idbem: idItemRaw },
      select: { idbem: true },
    })
    if (!itemExiste) { transferIgn++; continue }

    const dataTransferencia = o.datatransf
      ? new Date(fallStr(o.datatransf))
      : new Date()

    await prisma.hdTransferenciaCabecalho.create({
      data: {
        cimbpm: fallStr(o.cimbpm, "").slice(0, 50),
        dataTransferencia,
        idUsuarioRegistro,
        idUnidadeDestino,
        itens: {
          create: {
            idItem: idItemRaw,
            servidorAnterior: nullStr(o.servidoranterior),
            servidorAtual: nullStr(o.servidoratual),
          },
        },
      },
    })
    transferOk++
  }

  console.log(
    `  ${transferOk} transferências importadas, ${transferIgn} ignoradas (FK ausente).`
  )

  console.log("\n✅ Importação do SISGP concluída.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
