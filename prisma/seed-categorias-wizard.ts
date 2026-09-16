/**
 * Popula HdCategoria com um conjunto curado, alinhado às perguntas do assistente
 * de abertura de chamados (wizard-abertura-chamado.tsx), cada categoria já
 * marcada com o setor (área) responsável pelo atendimento.
 *
 * Desativa as categorias antigas (importadas do GLPI) em vez de apagar, para
 * não quebrar o vínculo com chamados históricos.
 *
 * Rodar com: npx tsx prisma/seed-categorias-wizard.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});
const prisma = new PrismaClient({ adapter });

type Categoria = {
  nome: string;
  pai: string;
  filho: string | null;
  area:
    | "suporte_tecnico"
    | "telefonia_voip"
    | "acesso_sistemas"
    | "rede_conectividade"
    | "reparos_infraestrutura";
};

const CATEGORIAS: Categoria[] = [
  // ── Suporte Técnico (HD — nível 1) ──────────────────────────────────
  { nome: "Computador não liga", pai: "Computador", filho: "Não liga", area: "suporte_tecnico" },
  { nome: "Computador com defeito", pai: "Computador", filho: "Defeito", area: "suporte_tecnico" },
  { nome: "Computador lento", pai: "Computador", filho: "Lentidão", area: "suporte_tecnico" },
  { nome: "Monitor com defeito", pai: "Monitor", filho: "Defeito", area: "suporte_tecnico" },
  { nome: "Mouse com defeito", pai: "Mouse com defeito", filho: null, area: "suporte_tecnico" },
  { nome: "Teclado com defeito", pai: "Teclado", filho: "Defeito", area: "suporte_tecnico" },
  { nome: "Impressora com defeito", pai: "Impressora", filho: "Defeito", area: "suporte_tecnico" },
  { nome: "Impressora sem suprimento", pai: "Impressora", filho: "Sem suprimento (toner/tinta)", area: "suporte_tecnico" },
  { nome: "Instalação de software", pai: "Instalação de Software", filho: null, area: "suporte_tecnico" },
  { nome: "Instalação de hardware", pai: "Instalação de Hardware", filho: null, area: "suporte_tecnico" },
  { nome: "Configuração de equipamento", pai: "Configuração de equipamento", filho: null, area: "suporte_tecnico" },
  { nome: "Backup / restauração de arquivos", pai: "Backup", filho: "Restauração de arquivos", area: "suporte_tecnico" },
  { nome: "Mudança de equipamento de local", pai: "Mudança de equipamento de local", filho: null, area: "suporte_tecnico" },
  { nome: "Outro equipamento", pai: "Outro equipamento", filho: null, area: "suporte_tecnico" },

  // ── Telefonia VoIP ───────────────────────────────────────────────────
  { nome: "Telefone sem linha ou sem tom", pai: "Telefone / Ramal", filho: "Sem linha ou sem tom", area: "telefonia_voip" },
  { nome: "Ramal não recebe chamadas", pai: "Telefone / Ramal", filho: "Não recebe chamadas", area: "telefonia_voip" },
  { nome: "Telefone sem áudio ou áudio ruim", pai: "Telefone / Ramal", filho: "Sem áudio ou áudio ruim", area: "telefonia_voip" },
  { nome: "Outro problema de telefonia", pai: "Telefone / Ramal", filho: "Outro problema", area: "telefonia_voip" },

  // ── Acesso a Sistemas ────────────────────────────────────────────────
  { nome: "Usuário ou senha incorretos", pai: "Acesso a Sistema", filho: "Usuário ou senha incorretos", area: "acesso_sistemas" },
  { nome: "Sem permissão / acesso bloqueado", pai: "Acesso a Sistema", filho: "Sem permissão / acesso bloqueado", area: "acesso_sistemas" },
  { nome: "Erro do sistema", pai: "Acesso a Sistema", filho: "Erro do sistema", area: "acesso_sistemas" },
  { nome: "Acesso a classificar", pai: "Acesso a Sistema", filho: "A classificar", area: "acesso_sistemas" },
  { nome: "Liberação de acesso", pai: "Liberação de Acesso", filho: null, area: "acesso_sistemas" },
  { nome: "Reset de senha de rede", pai: "Reset de Senha de Rede", filho: null, area: "acesso_sistemas" },
  { nome: "Criação de usuário de rede", pai: "Criação de Usuário de Rede", filho: null, area: "acesso_sistemas" },

  // ── Rede e Conectividade ─────────────────────────────────────────────
  { nome: "Sem internet", pai: "Rede", filho: "Sem internet", area: "rede_conectividade" },
  { nome: "Internet lenta", pai: "Internet lenta", filho: null, area: "rede_conectividade" },
  { nome: "Falha ao conectar no Wi-Fi", pai: "Rede", filho: "Falha ao conectar no Wi-Fi", area: "rede_conectividade" },
  { nome: "Problema na rede cabeada", pai: "Rede", filho: "Problema na rede cabeada", area: "rede_conectividade" },
  { nome: "Falha em VPN / acesso remoto", pai: "Rede", filho: "VPN / acesso remoto", area: "rede_conectividade" },

  // ── Reparos de Infraestrutura ────────────────────────────────────────
  { nome: "Infraestrutura predial", pai: "Infraestrutura Predial", filho: null, area: "reparos_infraestrutura" },
  { nome: "Iluminação", pai: "Infraestrutura Predial", filho: "Iluminação", area: "reparos_infraestrutura" },
  { nome: "Ar-condicionado", pai: "Infraestrutura Predial", filho: "Ar-condicionado", area: "reparos_infraestrutura" },
  { nome: "Tomada / energia", pai: "Infraestrutura Predial", filho: "Tomada / energia", area: "reparos_infraestrutura" },
  { nome: "Falta de energia no ponto", pai: "Infraestrutura Predial", filho: "Falta de energia no ponto", area: "reparos_infraestrutura" },
  { nome: "Hidráulica / vazamento", pai: "Infraestrutura Predial", filho: "Hidráulica / vazamento", area: "reparos_infraestrutura" },
  { nome: "Porta / fechadura", pai: "Infraestrutura Predial", filho: "Porta / fechadura", area: "reparos_infraestrutura" },
  { nome: "Mobiliário", pai: "Infraestrutura Predial", filho: "Mobiliário", area: "reparos_infraestrutura" },
  { nome: "Estrutura predial (parede/teto/piso)", pai: "Infraestrutura Predial", filho: "Estrutura (parede/teto/piso)", area: "reparos_infraestrutura" },
  { nome: "Elevador", pai: "Infraestrutura Predial", filho: "Elevador", area: "reparos_infraestrutura" },
  { nome: "Limpeza", pai: "Infraestrutura Predial", filho: "Limpeza", area: "reparos_infraestrutura" },
  { nome: "Dedetização / pragas", pai: "Infraestrutura Predial", filho: "Dedetização / pragas", area: "reparos_infraestrutura" },
];

async function main() {
  const desativadas = await prisma.hdCategoria.updateMany({
    where: { ativo: true },
    data: { ativo: false },
  });
  console.log(`Categorias antigas desativadas: ${desativadas.count}`);

  const criadas = await prisma.hdCategoria.createMany({
    data: CATEGORIAS.map((c) => ({ ...c, ativo: true })),
  });
  console.log(`Categorias curadas criadas: ${criadas.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
