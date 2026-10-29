/**
 * Seed dos sistemas e permissões padrão de acesso.
 * Uso: npx tsx prisma/seed-acesso-sistemas.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated";

function parseLocal() {
  const raw = process.env.DATABASE_URL!;
  const u = new URL(raw.replace(/^mysql:\/\//, "http://"));
  return {
    host: u.hostname,
    port: parseInt(u.port, 10) || 3306,
    user: decodeURIComponent(u.username) || "root",
    password: decodeURIComponent(u.password) || undefined,
    database: u.pathname.slice(1),
    connectionLimit: 3,
  };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(parseLocal()) });

const SISTEMAS: Array<{
  codigo: "sisacoe" | "sei" | "aprova_digital" | "slce" | "portal_licenciamento" | "simproc" | "sissel" | "slcii" | "licenca_sampa" | "suc";
  nome: string;
  permissoes: string[];
}> = [
  { codigo: "sisacoe", nome: "SISACOE", permissoes: ["Consulta", "Operador", "Administrador"] },
  { codigo: "sei", nome: "SEI", permissoes: ["Unidade", "Consulta processual", "Processo", "Administrador"] },
  { codigo: "aprova_digital", nome: "APROVA DIGITAL", permissoes: ["Solicitante", "Analista", "Administrador"] },
  { codigo: "slce", nome: "SLCE", permissoes: ["Consulta", "Operador", "Administrador"] },
  { codigo: "portal_licenciamento", nome: "PORTAL DE LICENCIAMENTO", permissoes: ["Consulta", "Requerente", "Analista", "Administrador"] },
  { codigo: "simproc", nome: "SIMPROC", permissoes: ["Consulta", "Operador", "Administrador"] },
  { codigo: "sissel", nome: "SISSEL", permissoes: ["Consulta", "Operador", "Administrador"] },
  { codigo: "slcii", nome: "SLCII", permissoes: ["Consulta", "Operador", "Administrador"] },
  { codigo: "licenca_sampa", nome: "LICENCIA SAMPA", permissoes: ["Consulta", "Operador", "Administrador"] },
  { codigo: "suc", nome: "SUC", permissoes: ["Consulta", "Operador", "Administrador"] },
];

async function main() {
  for (const s of SISTEMAS) {
    const sistema = await prisma.hdSistemaAcesso.upsert({
      where: { codigo: s.codigo },
      create: { codigo: s.codigo, nome: s.nome, ativo: true },
      update: { nome: s.nome, ativo: true },
    });

    for (const nomePerm of s.permissoes) {
      const existente = await prisma.hdSistemaPermissao.findFirst({
        where: { sistemaId: sistema.id, nome: nomePerm },
      });
      if (existente) {
        await prisma.hdSistemaPermissao.update({
          where: { id: existente.id },
          data: { ativo: true },
        });
      } else {
        await prisma.hdSistemaPermissao.create({
          data: { sistemaId: sistema.id, nome: nomePerm, ativo: true },
        });
      }
    }
    console.log(`✓ ${s.nome} (${s.permissoes.length} permissões)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
