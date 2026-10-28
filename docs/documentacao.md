# Sistema CAF — Documentação do projeto

Plataforma web de serviços internos da **Secretaria Municipal de Urbanismo e Licenciamento (SMUL)**, mantida pela CAF. Reúne, no mesmo repositório Next.js, os módulos de Help Desk, patrimônio, inventário de TI, reserva de salas, avaliação de limpeza, gestão de pessoas, assinatura de e-mail, teletrabalho e o protótipo da nova intranet.

Este documento descreve o sistema **como está implementado no código**. Requisitos de produto ainda não entregues (intranet persistida, PTI/metas do teletrabalho, etc.) estão na seção [Estado atual e lacunas](#16-estado-atual-e-lacunas) e nos documentos de requisitos citados ao final.

**Módulos (o que faz e regras):** [Home](#71-home-e-navegação) · [Help Desk](#72-help-desk) · [Inventário](#73-inventário-técnico-de-ti) · [Reserva de salas](#74-reserva-de-salas) · [Avaliação de limpeza](#75-avaliação-de-limpeza) · [Gestão de pessoas](#76-gestão-de-pessoas) · [Assinatura de e-mail](#77-assinatura-de-e-mail) · [Teletrabalho](#78-teletrabalho) · [Intranet](#79-intranet) · [Administração](#710-administração)

---

## 1. Visão geral

O aplicativo autentica o servidor, aplica permissões por papel e por catálogo, e oferece um conjunto de serviços internos a partir da home (`/`).

| Área | Situação | Persistência |
|---|---|---|
| Help Desk (chamados, acesso a sistemas, patrimônio, termos) | Produção / em uso | Prisma (`hd.*`) |
| Inventário técnico de TI | Produção / em uso | Prisma (`inv.*`) + coletor PowerShell |
| Reserva de salas | Produção / em uso | Prisma (`reserva_sala.*`) |
| Avaliação de limpeza | Produção / em uso | Prisma (`avaliacao_limpeza.*`) |
| Gestão de pessoas (FFI / SIGPEG) | Produção / em uso | Prisma (`gp.*`) |
| Assinatura de e-mail | Produção / em uso | Prisma (`assinatura.*`) |
| Teletrabalho (Fase 1: cadastros, registro, fechamento) | Implementado | Prisma (`tt.*`) |
| Intranet (feed, comunicados, diretório, eventos) | Protótipo navegável | Mock em `_mock/*` |
| Administração (usuários, coordenadorias, permissões) | Produção / em uso | Prisma (`principal.*`) |

O **SEI** permanece o sistema de record jurídico. O teletrabalho apenas referencia metadados de termos; documentos assinados não trafegam pela aplicação.

---

## 2. Stack técnico

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS, componentes no estilo shadcn/ui (Radix), Lucide |
| Formulários | react-hook-form + Zod |
| Tabelas | TanStack Table |
| Estado no cliente | TanStack React Query |
| Autenticação | NextAuth v5 (Credentials + JWT) |
| Diretório | LDAP / Active Directory (`ldapts`) |
| ORM | Prisma 7, schema em pasta (`prisma/schema`) |
| Banco | MySQL / MariaDB via `@prisma/adapter-mariadb` |
| E-mail | Nodemailer (SMTP) |
| Documentos | `docx` (termos de patrimônio) e `pdfmake` (FFI, relatórios) |
| Coleta de inventário | PowerShell (`scripts/inventario/coletar.ps1`) |

Idioma da interface: **pt-BR**. Datas no padrão `dd/mm/aaaa`. Fuso de negócio do teletrabalho: `America/Sao_Paulo`.

---

## 3. Arquitetura de pastas

```
app/
  (rotas-livres)/login/          Login (sem sessão)
  (rotas-auth)/                  Área autenticada (layout com sidebar)
    helpdesk/                    Help Desk + patrimônio + inventário
    reserva-salas/
    avaliacao-limpeza/
    gestao-pessoas/
    assinatura-email/
    teletrabalho/
    (rotas-dev)/                 Usuários, coordenadorias, permissões (flag desenvolvedor)
  (intranet)/intranet/           Protótipo da intranet (layout próprio)
  api/                           Route Handlers (REST)

components/                      UI compartilhada (sidebar, DataTable, Dialog, etc.)
lib/                             Regras de negócio, auth, Prisma, permissões
services/                        Helpers de sessão/permissão usados nas páginas
prisma/schema/                   Modelos Prisma por domínio
prisma/migrations/               Migrações versionadas
prisma/seed*.ts                  Cargas iniciais
scripts/inventario/              Coletor agentless
providers/                       Auth, tema, React Query
public/                          Estáticos e uploads
docs/                            Este arquivo e documentos de requisitos
```

### Groups de rota

- **`(rotas-livres)`** — telas públicas. Hoje: `/login`.
- **`(rotas-auth)`** — exige sessão (`auth()`); redireciona para `/login` se não houver. Renderiza `AppSidebar`, breadcrumbs e drawer mobile.
- **`(rotas-dev)`** — nested em `(rotas-auth)`. Exige `Usuario.desenvolvedor = true`; caso contrário redireciona para `/`.
- **`(intranet)`** — layout próprio (header + sidebar da intranet). O protótipo atual **não** replica o gate de sessão do `(rotas-auth)` no layout; a intenção de produto é reutilizar a mesma sessão (ver requisitos da intranet).

Páginas autenticadas seguem o padrão de cadastro da empresa (`base-frontend-2025`): Server Component na `page.tsx`, formulário com Zod, Dialog para criar/editar/excluir, `DataTable` e coluna de ações.

---

## 4. Configuração e execução

### 4.1 Variáveis de ambiente

Crie um `.env` (nunca versionar segredos reais).

**Obrigatórias**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/
AUTH_SECRET=troque-por-um-segredo-longo
NEXTAUTH_URL=http://localhost:3000

DATABASE_URL="mysql://usuario:senha@localhost:3306/nome_do_banco"
DATABASE_HOST=localhost
DATABASE_USER=usuario
DATABASE_PASSWORD=senha
DATABASE_NAME=nome_do_banco

# local = pula LDAP e autentica só contra o cadastro em Usuario
ENVIRONMENT=local
```

O Prisma Client (`lib/prisma.ts`) usa `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` e `DATABASE_NAME`. O `prisma.config.ts` usa `DATABASE_URL` para migrações.

**LDAP (produção / homologação)**

```env
LDAP_URL=ldap://servidor.ad
LDAP_DOMAIN=rede.sp
LDAP_BASE_DN=DC=exemplo,DC=local
LDAP_BIND_DN=CN=conta-servico,OU=...,DC=...
LDAP_BIND_SENHA=...
LDAP_IMPORT_DN=           # opcional; default = LDAP_BASE_DN
```

**E-mail (Help Desk — solicitações de acesso)**

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
HD_EMAIL_LIBERACAO_ACESSO=   # destinatários do setor de liberação (lista)
```

Se SMTP não estiver configurado, o sistema **não envia** e-mail: registra o conteúdo no log e segue o fluxo.

**Inventário**

```env
INV_COLETA_API_KEY=chave-forte
```

Sem essa chave, `POST /api/inventario/coleta` responde `503`. O coletor envia a mesma chave no header `X-Api-Key`.

**Integrações opcionais**

```env
SGU_DATABASE_URL=mysql://...     # leitura de responsáveis/unidades no SGU
GLPI_DATABASE_URL=mysql://...    # seed de importação (prisma/seed-glpi.ts)
CRON_SECRET=                     # protege o job de autorização tácita
```

### 4.2 Instalação

```bash
npm install
npm run db:generate
npm run db:migrate          # ou npm run db:push em ambiente local
npm run db:seed
npm run dev                 # http://localhost:3000
```

Build de produção: `npm run build` (gera o Prisma Client e em seguida o Next.js) e `npm start`.

### 4.3 Scripts npm

| Script | Função |
|---|---|
| `dev` | Next.js na porta 3000 |
| `build` | `prisma generate` + `next build` |
| `start` | Servidor de produção |
| `lint` | ESLint |
| `db:generate` | Gera o client em `prisma/generated` |
| `db:push` | Aplica o schema sem migração |
| `db:migrate` | `prisma migrate dev` |
| `db:studio` | Prisma Studio |
| `db:seed` | `prisma/seed.ts` |
| `db:seed:mock` | Unidades/coordenadorias de teste |

Seeds adicionais (execução manual com `tsx`): `prisma/seed-teletrabalho.ts`, `prisma/seed-gestao-pessoas.ts`, `prisma/seed-acesso-sistemas.ts`, `prisma/seed-categorias-wizard.ts`, `prisma/seed-assinatura.ts`, `prisma/seed-helpdesk-itens.ts`, `prisma/seed-glpi.ts`, `prisma/seed-sisgp.ts`.

---

## 5. Autenticação

NextAuth v5, estratégia **JWT**, provider **Credentials**. Código em `lib/auth/`.

Fluxo de login (`lib/auth/config.ts`):

1. O usuário informa login e senha em `/login`.
2. O sistema busca `Usuario` pelo `login`. Inexistente ou `status = false` → recusa.
3. Se `ENVIRONMENT=local`, **não** valida LDAP: só atualiza `ultimoLogin` e monta a sessão.
4. Caso contrário, autentica no AD (`login@LDAP_DOMAIN`), lê `displayName`, `mail`, foto e telefone, e sincroniza nome/e-mail/avatar no banco.
5. A sessão carrega: `id`, `login`, `nome`, `email`, `nomeSocial`, `avatar`, `coordenadoriaId`, `permissao`, `desenvolvedor`.

Rotas de API de auth: `app/api/auth/[...nextauth]/route.ts`.

Importação de usuários do AD usa bind de serviço (`LDAP_BIND_DN` / `LDAP_BIND_SENHA`) e `LDAP_IMPORT_DN`. Há um utilitário de descoberta de OU em `scripts/ldap-find-ou.ts`.

---

## 6. Autorização

Há **dois eixos** que convivem:

### 6.1 Papel operacional (`Usuario.permissao`)

Enum `PapelUsuario`: `DEV`, `ADM`, `TEC`, `SUP`, `PAT`, `USR`.

Usado principalmente pelo **Help Desk** (`lib/permissoes.ts`):

| Papel | Chamados | Patrimônio / inventário | Unidades HD | Relatórios | Catálogo de acesso a sistemas | Categorias de chamado |
|---|---|---|---|---|---|---|
| **DEV / ADM** | Atende e abre | Sim | Sim | Sim | Sim | Sim |
| **SUP** | Atende e abre | Não | Sim | Sim | Sim | Sim |
| **TEC** | Atende e abre | Não | Não | Sim | Não | Não |
| **PAT** | Não | Sim | Não | Não | Não | Não |
| **USR** | Só abre | Não | Não | Não | Não | Não |

`DEV`/`ADM` e o flag `desenvolvedor` também concedem **acesso total aos módulos** cujo controle é o catálogo (`temAcessoTotalModulos`).

A tela de usuários/coordenadorias no menu “Administração” aparece para `DEV` e `ADM`, mas o group `(rotas-dev)` só deixa passar quem tem `desenvolvedor = true`.

### 6.2 Catálogo de permissões (`Permissao` + `UsuarioPermissao`)

Nome no padrão `modulo.recurso.acao`. Enum `Modulo` no Prisma:

- `reserva_salas`
- `avaliacao_limpeza`
- `gestao_pessoas`
- `assinatura_email`
- `teletrabalho`

Helpers: `services/permissoes` (`listarPermissoes`, `validarPermissao`). Layouts de módulo chamam `validarPermissao` no servidor e redirecionam para `/` se faltar a permissão de visualizar.

Permissões granulares relevantes:

**Reserva de salas** — `reserva_salas.reservas.*`, `reserva_salas.salas_reserva.*`, `reserva_salas.agenda.*`.

**Avaliação de limpeza** — `avaliacao_limpeza.avaliacoes.*`, `.categorias.*`, `.criterios.*`, `.salas.*`.

**Gestão de pessoas** (`lib/gestao-pessoas/constants.ts`)

| Chave | Nome |
|---|---|
| Visualizar módulo | `gestao_pessoas.modulo.visualizar` |
| Importar SIGPEG | `gestao_pessoas.importacao.executar` |
| Imprimir FFI | `gestao_pessoas.folha_ponto.imprimir` |
| Gerenciar vínculos | `gestao_pessoas.permissoes.gerenciar` |

Há ainda papel **por unidade EH** (`GpUsuarioUnidade`): `usuario`, `administrador`, `dgp`. DGP vê todas as unidades.

**Assinatura de e-mail**

| Chave | Nome |
|---|---|
| Visualizar | `assinatura_email.modulo.visualizar` |
| Cadastros (setores, cargos, ramais) | `assinatura_email.cadastros.gerenciar` |

Qualquer usuário autenticado pode gerar a própria assinatura. Cadastros exigem a permissão acima ou acesso total.

**Teletrabalho** (`lib/teletrabalho/constants.ts`)

| Chave | Nome |
|---|---|
| Visualizar | `teletrabalho.modulo.visualizar` |
| Cadastros | `teletrabalho.cadastros.gerenciar` |
| Registro | `teletrabalho.registro.criar` |
| Validar | `teletrabalho.registro.validar` |
| Fechamento | `teletrabalho.fechamento.executar` |
| Relatórios | `teletrabalho.relatorios.emitir` |
| Adesões | `teletrabalho.adesoes.gerenciar` |
| Escala | `teletrabalho.escala.gerenciar` |

Complementado por papel **por unidade** (`TtUsuarioUnidade`): `servidor`, `chefia`, `coordenador`, `caf_dgp`. A resolução efetiva está em `obterAcessoTeletrabalho` (`lib/teletrabalho/permissoes.ts`): vínculo de servidor, papéis de unidade e catálogo são combinados.

---

## 7. Módulos

Cada subseção abaixo descreve **o que o módulo faz**, **quem pode usá-lo** e as **regras de negócio efetivas no código** (não só a intenção de produto).

### 7.1 Home e navegação

**O que faz.** Porta de entrada autenticada (`/`). Mostra cards dos serviços cujo usuário tem permissão de visualizar: Reserva de salas, Avaliação de limpeza e Gestão de pessoas. A sidebar agrupa Help Desk, Geral (intranet, reservas, limpeza, GP, teletrabalho) e Administração.

**Regras**

- Sem sessão → redireciona para `/login`.
- Cards da home só listam módulos com `temAcessoTotalModulos` **ou** a permissão de visualizar correspondente no catálogo.
- Menu Help Desk aparece se o papel abre/atende chamados **ou** acessa patrimônio (PAT).
- Teletrabalho só aparece se `obterAcessoTeletrabalho` resultar em `podeVisualizar`.
- Gestão de pessoas só aparece com acesso total ou `gestao_pessoas.modulo.visualizar`.
- Administração no menu: papéis `DEV`/`ADM`. As páginas em `(rotas-dev)` exigem ainda `Usuario.desenvolvedor = true`.
- O wizard de abertura de chamado oculta a sidebar enquanto estiver aberto.

---

### 7.2 Help Desk

**O que faz.** Central de atendimento de TI da SMUL: abertura e tramitação de chamados por área, conversa com anexos, encaminhamento entre equipes, envio à PRODAM, solicitações de acesso a sistemas (com autorização da chefia), cadastro de categorias/unidades, patrimônio, movimentações, baixas, termos e relatórios de tempo.

UI concentrada em `HdApp`; as rotas só escolhem a visão inicial. Código de regras: `lib/helpdesk/*`, `lib/permissoes.ts`.

#### Quem usa

| Papel | Pode |
|---|---|
| **USR** | Abrir chamado (próprio ou de colega); ver só os seus; confirmar ou recusar solução |
| **TEC** | Atender, resolver, encaminhar, PRODAM, relatórios; não património |
| **SUP** | Tudo do TEC + unidades, categorias, catálogo de acesso a sistemas e pontos focais |
| **PAT** | Patrimônio, transferências, termos, inventário técnico; não atende chamado |
| **DEV / ADM** | Tudo |

USR na listagem só vê chamados em que é solicitante, foi aberto em seu nome, ou está vinculado como ator. Staff (`TEC`/`SUP`/`ADM`/`DEV`) vê todos.

#### Áreas e categorias

Cinco filas (`HdTipoChamado`), cada uma com rota própria:

| Área | Rota | Escopo |
|---|---|---|
| Suporte técnico | `/helpdesk/chamados/suporte-tecnico` | Computador, impressora, software |
| Telefonia VoIP | `/helpdesk/chamados/telefonia-voip` | Ramais e voz |
| Acesso a sistemas | `/helpdesk/chamados/acesso-sistemas` | Liberação de permissão |
| Rede e conectividade | `/helpdesk/chamados/rede-conectividade` | Internet, cabeamento |
| Reparos de infraestrutura | `/helpdesk/chamados/reparos-infraestrutura` | Reparos físicos |

Categorias (`HdCategoria`) têm `pai` / `filho` e um campo `area` (setor de roteamento) editável em `/helpdesk/categorias` (DEV/ADM/SUP). Categoria sem `area` é compatível com qualquer fila. O wizard só oferece categorias cujo setor bate com a área escolhida.

#### Regras de abertura

- Título, descrição, unidade ativa e categoria ativa são obrigatórios.
- Prioridade: `baixa` | `media` | `alta` | `urgente`.
- **Suporte técnico exige item patrimonial do tipo Computador.**
- USR pode abrir em nome de um colega (ex.: colega sem internet): o solicitante fica o colega e `abertoEmNomeDeId` grava quem preencheu. USR **não** usa o campo “em nome de” da API de staff.
- Staff pode setar explicitamente `abertoEmNomeDeId`.
- Unidade e categoria precisam estar ativas.
- Mensagem inicial pode incluir o nome de rede da máquina (`lib/helpdesk/mensagem-inicial.ts`).

#### Máquina de status do chamado

```
aberto → atendimento → aguardando
                      → aguardando_autorizacao   (só acesso a sistemas)
                      → prodam
                      → resolvido → fechado
```

Regras:

- **Resolver:** só staff; texto da solução obrigatório; grava status `resolvido`, evento de resolução e mensagem tipo `solucao`.
- **Confirmar solução:** só solicitante ou quem abriu em nome dele (staff também pode). Só em chamado `resolvido`, dentro de **7 dias** a partir de `dataResolucao`.
  - Confirmou que resolveu → `fechado`.
  - Recusou → volta a `aberto`, limpa resolução e data.
- **Fechamento automático:** ao listar chamados, todo `resolvido` com mais de 7 dias vira `fechado` (evento de fechamento automático).
- **Encaminhar:** só staff; motivo obrigatório; origem ≠ destino; não encaminha `resolvido`/`fechado`. `areaOrigem` **nunca muda**; só `areaAtual`. Se o chamado estava em `prodam`, sai desse status ao encaminhar. Histórico em `HdChamadoEncaminhamento`.
- **PRODAM:** só staff; motivo obrigatório; não envia chamado já encerrado nem o que já está em `prodam`. Motivo gravado com prefixo fixo (`lib/helpdesk/prodam.ts`). Relatórios descontam o tempo em PRODAM do tempo líquido de atendimento.

Papéis no chamado: solicitante, técnico, observador, participante. Timeline (`HdChamadoEvento`) separada da conversa (`HdMensagem`: pública, interna, solução) e anexos.

#### Acesso a sistemas

Catálogo: SISACOE, SEI, Aprova Digital, SLCE, Portal de Licenciamento, SIMPROC. Cada sistema tem tipos de permissão cadastráveis (`/helpdesk/acesso-sistemas/permissoes`). Pontos focais por unidade: `/helpdesk/acesso-sistemas/pontos-focais`.

**Regras**

1. Só o **ponto focal da unidade** abre a solicitação (staff/SUP/ADM/DEV também pode).
2. Sistema, permissão e unidade precisam estar ativos; a permissão tem que pertencer ao sistema escolhido.
3. O chamado nasce em `aguardando_autorizacao`. O responsável (coordenador/diretor) é resolvido pelo SGU (se `SGU_DATABASE_URL` existir) e entra como observador; e-mail de autorização é disparado se SMTP estiver configurado.
4. **Autorizar:** o responsável (ou o job) muda a solicitação para `autorizado` e o chamado para `aberto`, para o setor de liberação atender.
5. **Negar:** somente o `responsavelAutorizacaoId` pode negar; motivo obrigatório; chamado vai para `fechado`; e-mail ao setor de liberação.
6. **Autorização tácita:** 7 dias sem resposta (`PRAZO_DIAS_AUTORIZACAO_ACESSO`). Job `/api/helpdesk/acesso-sistemas/jobs/autorizar-pendentes` (header com `CRON_SECRET`). A listagem de chamados também processa pendências expiradas.
7. Não se reabre solicitação já autorizada ou já negada.

Telas: `/helpdesk/chamados/acesso-sistemas`, `/helpdesk/chamados/acesso-sistemas/novo`, `/autorizacoes`.

#### Patrimônio e termos

Cadastro de bens (`HdItemPatrimonio`): patrimônio, tipo (Computador, Notebook, Impressora, Monitor, Plotter, Scanner, Outro), série, marca/modelo, CIM/SBPM, nome de rede, unidade, servidor, status.

Status: `Ativo`, `Manutenção`, `Estoque`, `Para Descarte`, `Baixado`, `Descartado`, `Doado`, `Inativo`.

**Regras**

- Alterar status (exceto Baixado) exige motivo; grava histórico. **Baixado só pelo fluxo formal de baixa** (documento SBPM obrigatório).
- Ao mudar status via botão operacional, o item é **movido automaticamente para a unidade ATIC** e o servidor vinculado é limpo (`movimentarItemParaAtic`). Sem unidade ATIC cadastrada, a alteração falha.
- Transferência: cabeçalho com CIM/SBPM, unidade destino, itens com servidor anterior/atual.
- USR na abertura de chamado só vê itens `Ativo`; PAT/ADM/DEV vê todos.
- Termos gerados em DOCX/PDF: entrega, ofício de saída e termo de responsabilidade (`/helpdesk/termos`).

Rotas: `/helpdesk/patrimonio`, `/movimentacoes`, `/termos`, `/unidades`, `/relatorios`.

---

### 7.3 Inventário técnico de TI

**O que faz.** Inventário de hardware/software/rede, complementar ao bem patrimonial. Painel de frota, detalhe do equipamento, fila de buscas e ingestão agentless (PowerShell). Acesso: o mesmo do patrimônio (`DEV`/`ADM`/`PAT`). Rotas sob `/helpdesk/inventario`.

**O que coleta.** SO, CPU, RAM, BIOS, placa, discos (SSD/HDD), IP/MAC, usuário logado, softwares do registro. Snapshot atual em `InvHardware` / `InvDisco` / `InvSoftware`. Mudanças de hostname, IP, MAC, usuário, SO e modelo vão para `InvHistorico` (nunca apaga).

**Regras de ingestão** (`lib/inventario/coleta.ts`)

- Autenticação da rota de coleta: header `X-Api-Key` = `INV_COLETA_API_KEY`. Sem chave no servidor → `503`.
- Identidade mínima: número de série **válido**, ou MAC, ou hostname. Seriais de BIOS lixo (`To Be Filled By O.E.M.`, `None`, `0`, etc.) são ignorados.
- Localização do registro existente: **série → MAC → hostname**.
- MAC normalizado para `AA:BB:CC:DD:EE:FF`.
- Se o serial casar com um `HdItemPatrimonio` ainda sem equipamento, **vincula 1:1 automaticamente**.
- Coleta bem-sucedida marca o equipamento `online` e atualiza `ultimoContato` / `ultimaColeta`.
- Fila de buscas: alvo `host` ou `subrede` (CIDR /16–/30). Status: `pendente` → `processando` → `concluida` | `erro`. Execução dispara `coletar.ps1 -FromQueue` (só funciona se a app rodar em Windows na rede).

Documentação operacional: `scripts/inventario/README.md`.

---

### 7.4 Reserva de salas

**O que faz.** Cadastro de salas de reunião (lotação, layout fixo/móvel, mobiliário, mídias, fotos de disposição) e fluxo de solicitação → aprovação → agenda. Entrada no módulo: `reserva_salas.reservas.visualizar`.

| Tela | Função |
|---|---|
| `/reserva-salas` | Visão geral |
| `/reserva-salas/nova` | Solicitar reserva |
| `/reserva-salas/minhas` | Reservas do usuário logado |
| `/reserva-salas/agenda` | Agenda oficial (aprovadas) |
| `/reserva-salas/salas` | Cadastro de salas |
| `/reserva-salas/admin` | Aprovar / cancelar / ver o dia |

Horário civil do prédio na API de ocupação: **9h–19h**.

**Máquina de status:** `SOLICITADO` → `APROVADO` | `CANCELADO`. Só `APROVADO` entra na agenda oficial.

**Regras de criação**

- Título, telefone/ramal, e-mail do usuário logado, número de participantes (≥ 1), coordenadoria ativa, sala ativa, data e horários.
- Término depois do início; não reserva no passado.
- **Conflito:** não pode haver outra reserva `SOLICITADO` ou `APROVADO` na mesma sala com intervalo sobreposto.
- Sala `MOVEL` com fotos de layout: o tipo de disposição é **obrigatório**; a descrição é copiada para a reserva (snapshot).
- Nasce sempre como `SOLICITADO` (aguardando administrador).

**Regras de aprovação / cancelamento**

- Aprovar e o painel admin exigem a checagem `validarPermissao("usuarios.importar")` — na prática **DEV/ADM** (acesso total) ou quem tiver essa permissão no catálogo.
- Só se aprova o que está `SOLICITADO`. Se nesse meio tempo surgiu conflito, a aprovação é recusada.
- O dono cancela a própria reserva (motivo opcional). Admin cancela qualquer uma, **motivo obrigatório**.
- Na agenda pública, usuário comum vê só início/fim (sem título nem nome); admin vê título e responsável.
- Próximos eventos (`/api/reservas/proximos`) listam apenas `APROVADO` com `fim` no futuro.

---

### 7.5 Avaliação de limpeza

**O que faz.** Avaliação periódica da limpeza de salas/banheiros: catálogo de categorias e critérios, cadastro das salas avaliadas, lançamento de notas com observação e fotos. Entrada: `avaliacao_limpeza.avaliacoes.visualizar`.

Abas: avaliações, categorias, critérios, salas. Permissões granulares `visualizar` / `criar` / `editar` / `excluir` por recurso.

**Regras**

- Uma avaliação por **mês + ano + sala** (unique no banco). Segunda tentativa no mesmo período falha.
- Notas por critério: `RUIM`, `REGULAR`, `BOM`, `OTIMO`.
- Arquivos podem ser ligados à avaliação ou a um critério específico.
- Na listagem da API: papel `ADM` vê todas; os demais vêem só as que eles próprios lançaram (`avaliadoPor`).
- Categorias e critérios são cadastro mestre: critério pertence a uma categoria; a nota é lançada no cruzamento critério × avaliação.

---

### 7.6 Gestão de pessoas

**O que faz.** Substitui o fluxo legado de Folha de Frequência Individual (FFI): importa a carga mensal do SIGPEG, consulta servidores por competência e imprime o PDF da folha. Não é ponto eletrônico nem folha de pagamento.

Entrada: `gestao_pessoas.modulo.visualizar`. Home do módulo redireciona para `/gestao-pessoas/folha-ponto`.

| Aba | Permissão efetiva |
|---|---|
| Folha de ponto | `folha_ponto.imprimir` ou vínculo em alguma unidade |
| Servidores | visualizar |
| Importação SIGPEG | `importacao.executar` ou papel `administrador`/`dgp` na unidade |
| Permissões por unidade | `permissoes.gerenciar` ou papel `administrador`/`dgp` |

Papéis em `GpUsuarioUnidade`: `usuario` (imprime a sua fatia EH), `administrador` (importa e gerencia vínculos da unidade), `dgp` (vê todas as unidades; EH da DGP: `291000020000000`).

**Regras**

- Código EH tem 15 dígitos. Impressão agrupa pelos **6 primeiros** (`prefixoEh`). DGP ignora o recorte e vê tudo.
- Importar de novo o mesmo mês/ano **apaga a carga anterior** e regrava os vínculos (snapshot por competência).
- Mestre `GpServidor` é upsert por RF; flag `ultimaCarga` marca quem veio no arquivo mais recente.
- Na FFI, RF duplicado na competência: prevalece cargo comissionado (`DAS`, `DAI`, `CHG`, `SM`); depois ordena por EH e nome.
- Unidades da carga são upsert automático (`garantirUnidadeEh`).

---

### 7.7 Assinatura de e-mail

**O que faz.** Gera a assinatura institucional da SMUL (HTML para Outlook/webmail): nome, cargo, unidade, andar, ramal, aniversário. Preview, copiar e baixar. Cadastros de unidades, cargos e ramais de grupo.

**Regras**

- Qualquer usuário autenticado gera e grava o **próprio** perfil (`AssinaturaPerfil`, 1:1 com `Usuario`).
- Cadastros (setores, cargos, ramais) exigem `assinatura_email.cadastros.gerenciar` ou acesso total.
- Ramal de grupo (`AssinaturaGrupoRamal`) é indexado pelo **login** e **prevalece** sobre o ramal digitado no perfil.
- Andares permitidos na constante: 8, 17, 18, 19, 20, 21, 22. Secretaria, endereço e site são fixos em `lib/assinatura-email/constants.ts`.
- Setores e cargos inativos não aparecem no formulário de geração.

---

### 7.8 Teletrabalho

**O que faz.** Controle do regime permanente de teletrabalho nas unidades: cadastros (unidade, servidor, cargo, catálogo de atividades), metadados de adesão/desligamento, escala, registro diário de atividades com pontuação, validação da chefia, fechamento mensal e emissão de relatórios.

Implementa a **Fase 1** dos requisitos. **Não** há PTI, metas, indicadores, apuração nem geração do Anexo III. O SEI continua o sistema jurídico; aqui só há datas/situação dos termos.

Normas de referência: Decreto 59.755/2020, Portaria SEGES 63/2023, Portaria SMUL 164/2023, OI SMUL 01/2024. Detalhe de produto: `docs/requisitos-sistema-teletrabalho-smul.md`.

#### Quem usa

| Papel (unidade) | Pode |
|---|---|
| Servidor (com `TtServidor` vinculado) | Registrar os próprios dias |
| Chefia / coordenador | Validar, devolver, escala, fechar competência, relatórios da unidade |
| CAF/DGP | Cadastros, adesões, relatórios, reabrir competência |
| DEV/ADM | Tudo |

Acesso efetivo = catálogo `teletrabalho.*` **combinado** com `TtUsuarioUnidade` e o vínculo `TtServidor.usuarioId` (`obterAcessoTeletrabalho`).

#### Cadastros e catálogo

- Unidade hierárquica (pai/filha), sigla, EH opcional, chefia.
- Cargo é **por unidade**. Atividade pertence a uma categoria da unidade.
- Pontuação **não** é da atividade: é da associação cargo × atividade, com vigência (`inicioVigencia` / `fimVigencia`). Mudar pontuação = encerrar vigência e criar outra; registros antigos conservam o snapshot.
- Servidor: RF único, e-mail funcional, telefone **setorial** (sem residencial/pessoal), unidade, cargo, opcionalmente usuário do sistema.
- Exercício (ano) e feriados (nacional, municipal, ponto facultativo). Dia útil = não fim de semana e não feriado.

#### Escala

Algoritmo padrão `atecc_grupos_2`: 2 grupos, 2 dias remotos / 3 presenciais, dia de presença integral rotativo conforme o mês (seg/qua/sex). Fim de semana e feriado = Folga. Cada servidor tem um grupo (1 ou 2) e janela de disponibilidade/almoço.

Só é dia de teletrabalho se `resolverStatusDia` retornar `Teletrabalho`.

#### Registro diário

Estados: `RASCUNHO` → `ENVIADO` → `VALIDADO`. Devolução: `ENVIADO` ou `VALIDADO` → `DEVOLVIDO` (volta a poder editar).

**Regras**

- Um registro por servidor por dia. Excluído logicamente **não pode ser recriado**.
- Só registra se: servidor ativo; Termo de Adesão **vigente** na data (assinatura ≤ data do registro); o dia é teletrabalho; a competência da unidade **não está fechada**.
- Atividades: somente as vigentes para o **cargo naquela data**. Quantidade inteira ≥ 1.
- Pontuação total é **recalculada no servidor**; o cliente não manda o total. Cada item grava snapshot de descrição e pontuação unitária.
- Enviar exige ao menos uma atividade. Se o preenchimento passou do **primeiro dia útil seguinte** ao dia registrado, `motivoAtraso` é obrigatório.
- `VALIDADO` só muda se a chefia devolver (justificativa obrigatória).
- Excluir: motivo obrigatório; não exclui `VALIDADO`; não exclui competência fechada.
- Visão do registro: o próprio servidor, chefia/coordenador da unidade, CAF/DGP ou acesso total.

#### Fechamento e relatório

- Fechar: chefia/coordenador da unidade, CAF/DGP ou acesso total.
- Bloqueia se existir registro da competência em `RASCUNHO`, `ENVIADO` ou `DEVOLVIDO`.
- Competência fechada torna os registros imutáveis.
- Reabrir exige justificativa e gera auditoria; o relatório anterior permanece versionado (`TtRelatorioEmitido`).
- Relatório individual (por dia: atividades, quantidades, pontuação, processos, observações) e consolidado da unidade.

Toda criação/alteração/validação/devolução/exclusão/fechamento/reabertura grava `TtAuditLog` (ator, data, estado anterior).

Seed ATECC: `prisma/seed-teletrabalho.ts`. Protótipo de referência: `docs/atecc-teletrabalho-main/`.

---

### 7.9 Intranet

**O que faz.** Protótipo da plataforma de comunicação interna da SMUL (feed, comunicados, aniversários, diretório, eventos, perfil, busca, notificações). Posicionamento: **comunicação e integração**, não rede social.

Rotas: `/intranet` (feed), `/aniversarios`, `/comunicados`, `/diretorio`, `/eventos`, `/perfil`.

**Estado atual (regras ainda mock)**

- Conteúdo em `_mock/*`. Curtir, comentar, parabenizar e notificações **não persistem**.
- Tipos de publicação na UI: `comum`, `comunicado`, `conquista`, `kudos`, `vaga`.
- Layout `(intranet)` **não** aplica o mesmo gate de sessão do restante do sistema.
- Não há schema Prisma `intranet.*`.

**Regras de produto já definidas (a implementar)** — `docs/requisitos-intranet-smul.md`:

- Identidade reusa a base do Help Desk; sem cadastro paralelo de pessoas.
- Perfil de publicação no **servidor**: Servidor (post, kudos), responsável de unidade (conquista, evento), CIPA, ASCOM (editorial), RH, Administrador.
- Kudos **sem ranking**. Aniversário com opt-out. Comunicado segmentado (SMUL / unidade / perfil) e ciência de leitura. Soft delete com auditoria.
- Diretório só mostra contato funcional (e-mail, ramal), nunca telefone pessoal ou endereço.

---

### 7.10 Administração

**O que faz.** Cadastro de usuários do sistema, coordenadorias e o catálogo de permissões dos módulos. Importação do Active Directory (um a um ou em lote).

Rotas (group `(rotas-dev)`): `/usuarios`, `/coordenadorias`, `/permissoes`.

**Regras**

- Layout exige `Usuario.desenvolvedor = true`. Sem o flag, redireciona para `/` mesmo que o papel seja `ADM`.
- Usuário inativo (`status = false`) não autentica.
- Login e e-mail são únicos. Papel padrão ao criar: `USR`.
- Importação LDAP usa bind de serviço; sincroniza nome, e-mail, telefone e foto.
- Coordenadoria inativa não aparece nos selects da reserva de salas.
- Atribuir permissão de catálogo é N:N (`UsuarioPermissao`). DEV/ADM/desenvolvedor já passam em `validarPermissao` sem vínculo explícito.

---

## 8. Modelo de dados

Schema dividido em arquivos sob `prisma/schema/`. Tabelas prefixadas por schema MySQL lógico no `@@map`.

### 8.1 Principal — `schema.prisma`

- `Coordenadoria`
- `Usuario` (login único, papel, flag desenvolvedor, coordenadoria)
- `Permissao` / `UsuarioPermissao`

### 8.2 Help Desk — `helpdesk.prisma`

Unidades, categorias, chamados, eventos, mensagens, anexos, encaminhamentos, catálogo de sistemas/permissões, pontos focais, solicitações de acesso, itens patrimoniais, histórico de status, baixas, transferências.

### 8.3 Inventário — `inventario.prisma`

Equipamento, hardware, discos, softwares, histórico, localização, alertas, fila de coleta, sub-redes.

### 8.4 Reserva de salas — `reserva_sala.prisma`

Sala, fotos de layout, mobiliário, mídia, reserva, participantes.

### 8.5 Avaliação de limpeza — `avaliacao_limpeza.prisma`

Categoria, critério, sala, avaliação, notas por critério, arquivos.

### 8.6 Gestão de pessoas — `gestao_pessoas.prisma`

Unidade EH, servidor, carga mensal, vínculo por competência, `GpUsuarioUnidade`.

### 8.7 Assinatura — `assinatura.prisma`

Setor, cargo, grupo de ramal, perfil do usuário.

### 8.8 Teletrabalho — `teletrabalho.prisma`

Unidade hierárquica, servidor, papéis, cargo, categoria/atividade, associação cargo×atividade com vigência e pontuação, exercício, feriado, termos, regime de escala, registro diário, itens do registro, fechamento, relatório emitido, audit log.

**Fora do banco hoje:** entidades da intranet e entidades de PTI/meta/indicador/apuração do teletrabalho (Fases 2+).

---

## 9. APIs (Route Handlers)

Todas sob `app/api/`. Autenticação: as rotas de negócio leem a sessão (`auth()`); a ingestão de inventário usa API key; o job de autorização tácita usa `CRON_SECRET`.

### Auth

| Método | Rota |
|---|---|
| * | `/api/auth/[...nextauth]` |

### Usuários e permissões

| Método típico | Rota |
|---|---|
| GET/POST | `/api/usuarios` |
| GET/PATCH | `/api/usuarios/[id]` |
| GET | `/api/usuarios/busca` |
| POST | `/api/usuarios/importar`, `/importar-lote` |
| GET | `/api/usuarios/permissoes`, `/permissoes/desenvolvedor`, `/permissoes/validar/[permissao]` |
| PATCH | `/api/usuarios/desenvolvedor` |
| GET/POST | `/api/permissoes` |
| GET/POST | `/api/coordenadorias` |
| GET/PATCH | `/api/coordenadorias/[id]` |

### Help Desk

| Recurso | Rotas |
|---|---|
| Chamados | `/api/helpdesk/chamados`, `/chamados/[id]/mensagens`, `/anexos`, `/atores`, `/encaminhar`, `/resolver`, `/avaliacao`, `/confirmacao`, `/prodam` |
| Categorias | `/api/helpdesk/categorias`, `/categorias/[id]` |
| Unidades | `/api/helpdesk/unidades`, `/unidades/[id]` |
| Itens | `/api/helpdesk/itens`, `/itens/[id]`, `/itens/[id]/status` |
| Transferências / baixas | `/api/helpdesk/transferencias`, `/baixas` |
| Termos | `/api/helpdesk/termos/gerar` |
| Acesso a sistemas | `/acesso-sistemas/catalogo`, `/permissoes`, `/permissoes/[id]`, `/pontos-focais`, `/pontos-focais/[id]`, `/chamados`, `/chamados/[id]/negar`, `/autorizacoes`, `/buscar-usuario`, `/jobs/autorizar-pendentes` |

### Inventário

| Recurso | Rotas |
|---|---|
| Coleta | `POST /api/inventario/coleta` |
| Equipamentos | `/api/inventario/equipamentos`, `/equipamentos/[id]` |
| Buscas | `/api/inventario/buscas`, `/buscas/[id]`, `/buscas/pendentes`, `/buscas/executar` |
| Auxiliar | `/api/inventario/patrimonio-disponivel` |

### Reserva de salas

`/api/salas`, `/api/salas/[id]`, fotos de layout, `/api/reservas`, `/reservas/proximos`, `/reservas/solicitacoes`, `/reservas/admin`.

### Avaliação de limpeza

`/api/avaliacaolimpezas`, `/avaliacaolimpezas/salas`, `/salas/[id]`.

### Gestão de pessoas

`/api/gestao-pessoas/acesso`, `/servidores`, `/importacao`, `/cargas`, `/folha-ponto/pdf`, `/permissoes`, `/unidades-impressao`.

### Assinatura de e-mail

`/api/assinatura-email/proprio`, `/setores`, `/setores/[id]`, `/cargos`, `/cargos/[id]`, `/ramais`, `/ramais/[id]`.

### Teletrabalho

Contexto, unidades, servidores, cargos, atividades, cargo-atividades, categorias, feriados, adesões, desligamentos, escala, calendário, registros (CRUD, validar, devolver), atividades vigentes, fechamento, relatórios.

---

## 10. Integrações externas

| Sistema | Uso |
|---|---|
| **Active Directory (LDAP)** | Login em não-local; importação de usuários; descoberta de computadores no coletor (`-FromAD`) |
| **SMTP** | Avisos de solicitação de acesso a sistemas |
| **SGU** | Leitura opcional (`SGU_DATABASE_URL`) de responsáveis/unidades — `lib/sgu/` |
| **SIGPEG** | Arquivo de carga mensal de servidores (não é API; upload na tela de importação) |
| **GLPI** | Seed opcional a partir de base GLPI (`GLPI_DATABASE_URL`) |
| **WinRM** | Coleta remota de inventário nas estações |
| **SEI / SBPM** | Referência manual (número de documento); o sistema não assina nem substitui o SEI |

---

## 11. Padrões de interface

- **Cadastros CRUD:** `page.tsx` (Server Component) + `_components/form-*.tsx` + `modal-update-create.tsx` + `modal-delete.tsx` + `columns.tsx` + `DataTable`. Referência: regra do workspace `padrao-cadastro-base-frontend`.
- **Módulos com abas:** `TabsNav` + arquivo `abas.ts` por módulo (teletrabalho, gestão de pessoas, assinatura, reserva, limpeza).
- **Tema:** `next-themes`, claro/escuro.
- **Toasts:** Sonner.
- Help Desk usa um SPA interno (`HdApp`) por densidade operacional; as demais áreas seguem páginas Next.

---

## 12. Segurança (o que o código já faz)

- Sessão JWT; perfil e permissões resolvidos no servidor, não confiando em payload do cliente para autorização.
- Layouts de módulo validam permissão antes de renderizar.
- APIs de escrita do Help Desk / teletrabalho / GP conferem papel ou catálogo.
- Coletor de inventário autenticado por API key (não pela sessão do usuário).
- Job de autorização tácita exige `CRON_SECRET`.
- Teletrabalho: trilha `TtAuditLog`; registros validados só voltam por devolução da chefia; fechamento congela a competência.
- Dados pessoais: diretório/intranet (requisito) e teletrabalho não devem exibir telefone pessoal nem endereço residencial.

O que ainda falta em relação aos requisitos escritos: persistência e autorização da intranet; PTI/metas; e o layout `(intranet)` ainda não replica o mesmo gate de sessão do restante do sistema.

---

## 13. Como a home e o menu decidem o que mostrar

1. Sessão presente → layout autenticado.
2. Help Desk: qualquer papel que abra ou atenda chamados, ou PAT (patrimônio).
3. Intranet e reserva/limpeza aparecem no grupo Geral da sidebar (reserva/limpeza ainda dependem da permissão de módulo nas próprias rotas).
4. Gestão de pessoas: acesso total **ou** `gestao_pessoas.modulo.visualizar`.
5. Teletrabalho: `obterAcessoTeletrabalho` (catálogo, papéis de unidade ou servidor vinculado).
6. Administração: `DEV`/`ADM` no menu; páginas só com `desenvolvedor`.

---

## 14. Fluxos ponta a ponta (resumo)

**Abrir chamado de suporte**  
Wizard → escolhe área e categoria → (suporte técnico) seleciona computador → grava `HdChamado` na área de origem/atual → evento de abertura → fila da área.

**Pedir acesso a sistema**  
Ponto focal → escolhe beneficiário, sistema e permissão → chamado `aguardando_autorizacao` → e-mail ao responsável → autoriza / nega / 7 dias tácito → chamado `aberto` para o setor de liberação.

**Inventariar uma máquina**  
Agendar `coletar.ps1` ou enfileirar busca → POST coleta com API key → upsert equipamento + histórico → vínculo patrimonial se o serial existir.

**Registrar dia de teletrabalho**  
Servidor com adesão vigente e dia remoto no calendário → lança atividades do cargo → pontuação no servidor → envia → chefia valida ou devolve → no fim do mês a chefia fecha se não houver pendência → emite relatório.

**Imprimir FFI**  
Importação SIGPEG do mês → usuário com unidade EH (ou DGP) → gera PDF da Folha de Frequência Individual.

---

## 15. Documentos relacionados

| Arquivo | Conteúdo |
|---|---|
| [README.md](../README.md) | Guia rápido (parcialmente desatualizado em relação aos módulos novos) |
| [docs/intranet.md](./intranet.md) | Proposta conceitual da nova intranet |
| [docs/requisitos-intranet-smul.md](./requisitos-intranet-smul.md) | Requisitos Fase 1 da intranet |
| [docs/requisitos-sistema-teletrabalho-smul.md](./requisitos-sistema-teletrabalho-smul.md) | Requisitos completos do teletrabalho (Fases 1–4) |
| [scripts/inventario/README.md](../scripts/inventario/README.md) | Operação do coletor PowerShell |
| `docs/atecc-teletrabalho-main/` | Protótipo ATECC usado como referência de catálogo/escala |

---

## 16. Estado atual e lacunas

**Entregue neste repositório**

- Identidade (usuários, LDAP, papéis, catálogo de permissões).
- Help Desk completo (cinco áreas, wizard, encaminhamento, PRODAM, acesso a sistemas com autorização tácita).
- Patrimônio, transferências, baixas e termos.
- Inventário técnico com coleta e fila de buscas.
- Reserva de salas e avaliação de limpeza.
- Gestão de pessoas (SIGPEG + FFI).
- Assinatura de e-mail.
- Teletrabalho Fase 1 (cadastros, escala, registro, validação, fechamento, relatórios, auditoria).

**Ainda não no produto (documentado como requisitos)**

- Intranet: sair do mock — persistência Prisma, permissões de publicação, segmentação de comunicados, kudos reais, aniversário a partir do cadastro, busca e notificações persistidas.
- Teletrabalho Fases 2–4: PTI, metas, indicadores, apuração, Anexo III, Relatório de Metas, conectores externos.
- Área dedicada CIPA, Central do Servidor, organograma interativo, enquetes, galeria — previstos na proposta da intranet, fora do núcleo atual.

Ao implementar cadastros novos, manter o padrão `base-frontend-2025` e o fatiamento de schema Prisma por domínio (`hd.*`, `inv.*`, `tt.*`, `gp.*`, etc.), evitando misturar tabelas no `schema.prisma` principal.
