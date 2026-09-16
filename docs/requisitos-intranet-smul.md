# Nova Intranet SMUL

**Documento de Requisitos**
Versão 0.1 — rascunho para validação
Baseado em [intranet.md](./intranet.md) (proposta conceitual)

---

## 1. Objetivo

Renovar a intranet da Secretaria Municipal de Urbanismo e Licenciamento (SMUL), transformando-a de repositório de links e sistemas em uma plataforma viva de comunicação e integração, combinando comunicação oficial, interação entre servidores, reconhecimento, agenda institucional e acesso a serviços.

Quatro pilares orientadores: **Comunicação + Pessoas + Trabalho + Cultura**.

Posicionamento do produto: **plataforma de comunicação e integração da SMUL** — não uma "rede social interna". A interação social existe, mas está a serviço da comunicação institucional.

### 1.1 Escopo deste documento

Este documento cobre a **Fase 1**: o **layout** (navegação, composição da Home) e as **funcionalidades-núcleo** da intranet — feed, publicações, comunicados, aniversários, kudos, conquistas, agenda, diretório, perfil, notificações e busca.

Os **módulos de serviço** (Reserva de Salas, Central de TI/Helpdesk, Inventário, CIPA como área dedicada, Central do Servidor, Enquetes, Galeria, Organograma interativo) ficam para etapas seguintes e são tratados em documentos de requisitos próprios, com exceção de pontos de integração já indicados na seção 10 (Fora de escopo). Helpdesk e Inventário já existem como sistemas separados neste monorepo (`app/(rotas-auth)/helpdesk`) e serão linkados a partir da intranet, não reconstruídos aqui.

### 1.2 Estado atual

Já existe um protótipo navegável em `app/(intranet)/intranet`, com dados mock, cobrindo Feed, Comunicados, Aniversários, Diretório, Eventos, Perfil, Notificações e Busca. Este documento formaliza os requisitos desse núcleo, aponta lacunas frente à proposta conceitual e define o que falta para sair do mock e virar produto real (persistência, permissões, integrações).

---

## 2. Glossário

| Termo | Definição |
|---|---|
| **Feed** | Lista cronológica (ou priorizada) de publicações da intranet, ponto central da Home |
| **Publicação (Post)** | Item de conteúdo no feed. Tipos: comum, comunicado, conquista, kudos, vaga interna, notícia (ASCOM), evento |
| **Comunicado** | Publicação institucional que exige leitura/ciência, podendo ser fixada no topo |
| **Notícia / Matéria** | Conteúdo editorial produzido pela ASCOM (texto, galeria, vídeo) |
| **Kudos** | Reconhecimento entre servidores, sem ranking |
| **Conquista** | Publicação de entrega, marco ou resultado institucional |
| **Unidade** | Coordenadoria, divisão ou setor da SMUL, com hierarquia própria |
| **Segmentação** | Direcionamento de uma publicação para toda a SMUL, uma unidade, um perfil ou um público específico |
| **Perfil de publicação** | Papel do usuário que determina quais tipos de conteúdo ele pode publicar (ver seção 6) |

---

## 3. Atores e perfis

| Perfil | Permissões de publicação | Observação |
|---|---|---|
| **Servidor** | Post comum, Kudos | Perfil padrão de todo usuário autenticado |
| **Responsável de unidade** | Post, Conquista, Evento | Chefia/coordenação de uma unidade |
| **CIPA** | Post, Comunicado da CIPA, Evento | Grupo com escopo de publicação próprio |
| **ASCOM** | Notícia, Campanha, Comunicado, demais formatos editoriais | Único perfil com acesso à área editorial completa |
| **RH / Gestão de Pessoas** | Post, Comunicado, Evento, gestão de Aniversários e Vagas internas | |
| **Administrador** | Gestão completa da plataforma, permissões e moderação | |

A autenticação e o vínculo unidade/cargo do servidor devem reaproveitar a base já usada pelo Helpdesk (`lib/permissoes.ts`, `lib/helpdesk/session.ts`) em vez de recriar um cadastro paralelo de pessoas — ver RN-01.

---

## 4. Layout e arquitetura de navegação

### 4.1 Menu principal

| Menu | Conteúdo | Status |
|---|---|---|
| Início | Feed, destaques, atalhos rápidos | Implementado (mock) |
| Comunicação | Notícias, Comunicados, ASCOM, Galeria | Comunicados implementado; Notícias/ASCOM e Galeria pendentes |
| Pessoas | Diretório, Organograma, Aniversários, Reconhecimentos | Diretório e Aniversários implementados; Organograma pendente (fase 2) |
| Agenda | Eventos, Treinamentos, CIPA, Calendário | Eventos implementado (lista); calendário e CIPA pendentes |
| Meu perfil | Perfil, Notificações, Preferências | Perfil e Notificações implementados |

A navegação atual (`navigation-items.ts`) é uma lista plana (Início, Aniversários, Comunicados, Diretório, Eventos, Meu perfil). O requisito RF-01 abaixo pede a reorganização em grupos, conforme tabela acima, mantendo compatibilidade de rotas existentes.

CIPA, Central do Servidor e Tecnologia (Central de TI) **não** entram no menu principal nesta fase — permanecem como cards/atalhos na Home e evoluem para módulos dedicados depois (seção 10).

### 4.2 Composição da Home

| Área principal (feed) | Área lateral |
|---|---|
| Feed SMUL (todas as publicações, com categorias visuais) | Aniversários do dia |
| — | Agenda (próximos eventos) |
| — | Avisos prioritários (comunicados fixados) |
| — | Atalhos para sistemas (Helpdesk, sistemas internos) |
| — | Suporte / abrir chamado |

### 4.3 Categorias visuais de publicação

`COMUNICADO`, `ASCOM`, `CIPA`, `EVENTO`, `CONQUISTA`, `KUDOS`, `TI`, `RH`, `VAGA INTERNA`. Cada categoria tem cor/ícone próprio, consistente em feed, notificações e busca.

O tipo hoje modelado (`IntranetPublicationType`: `comum | comunicado | conquista | kudos | vaga`) precisa ser estendido para cobrir `ascom`, `cipa`, `ti`, `rh` — ver RF-05.

---

## 5. Requisitos funcionais

Prioridade: **P0** bloqueante · **P1** essencial · **P2** importante · **P3** desejável

### 5.1 Layout e navegação

| ID | Requisito | Pri |
|---|---|---|
| RF-01 | Reorganizar o menu principal em grupos (Início, Comunicação, Pessoas, Agenda, Meu perfil), conforme 4.1 | P1 |
| RF-02 | Exibir na Home a área lateral com aniversários do dia, próximos eventos, avisos prioritários e atalhos de sistemas | P1 |
| RF-03 | Exibir badge de notificações não lidas no ícone do sino, com contagem | Implementado |
| RF-04 | Layout responsivo (desktop e mobile), com sidebar colapsável | P1 |

### 5.2 Feed e publicações

| ID | Requisito | Pri |
|---|---|---|
| RF-05 | Suportar os tipos de publicação: comum, comunicado, notícia (ASCOM), conquista, kudos, vaga interna, evento | P0 |
| RF-06 | Renderizar cada tipo com estilo visual e ícone próprios (categorias da seção 4.3) | P1 |
| RF-07 | Permitir curtir e comentar publicações | Implementado (mock) |
| RF-08 | Restringir os tipos de publicação disponíveis para o usuário conforme seu perfil (seção 3 / RN-02) | P0 |
| RF-09 | Ordenar o feed cronologicamente, com comunicados prioritários fixados no topo | P1 |
| RF-10 | Suportar imagem/galeria e anexos na publicação | P2 |
| RF-11 | Persistir publicações, curtidas e comentários em banco (hoje em mock) | P0 |

### 5.3 Comunicados

| ID | Requisito | Pri |
|---|---|---|
| RF-12 | Cadastrar comunicado com título, texto, data e opção de fixar no topo | P1 |
| RF-13 | Segmentar comunicado por: toda a SMUL, unidade, perfil ou público específico | P1 |
| RF-14 | Permitir ao servidor marcar comunicado como lido | P1 |
| RF-15 | Exibir ao administrador/autor indicadores de recebimento, visualização e confirmação de leitura | P2 |

### 5.4 Aniversários

| ID | Requisito | Pri |
|---|---|---|
| RF-16 | Exibir card diário com os aniversariantes do dia | Implementado (mock) |
| RF-17 | Permitir parabenizar com mensagem rápida ou personalizada | Implementado (mock, sem persistência) |
| RF-18 | Contabilizar felicitações recebidas por aniversariante | P1 |
| RF-19 | Permitir ao servidor optar por não exibir seu aniversário (privacidade) | P1 |
| RF-20 | Derivar data de nascimento do cadastro de servidor (mesma fonte usada por Helpdesk/RH), sem recadastro manual | P1 |

### 5.5 Kudos / Reconhecimento

| ID | Requisito | Pri |
|---|---|---|
| RF-21 | Permitir a qualquer servidor enviar Kudos a um colega, com categoria (Trabalho em equipe, Inovação, Colaboração, Excelente trabalho, Ajuda, Atendimento) e mensagem | P1 |
| RF-22 | Exibir Kudos no feed de forma opcional (o remetente escolhe se publica) | P2 |
| RF-23 | Não exibir ranking ou contagem comparativa de Kudos entre servidores | P0 (restrição) |

### 5.6 Conquistas

| ID | Requisito | Pri |
|---|---|---|
| RF-24 | Permitir a responsável de unidade publicar Conquista (projeto concluído, marco, resultado) | P1 |
| RF-25 | Vincular Conquista à unidade responsável e, opcionalmente, aos servidores envolvidos | P2 |

### 5.7 Agenda / Eventos

| ID | Requisito | Pri |
|---|---|---|
| RF-26 | Listar eventos com data, horário, local, descrição e responsável | Implementado (mock) |
| RF-27 | Categorizar evento (Institucional, ASCOM, CIPA, Treinamento, Palestra, Reunião, TI, Gestão de Pessoas, Datas importantes) | P1 |
| RF-28 | Permitir ao servidor marcar "Tenho interesse" em um evento | P2 |
| RF-29 | Enviar lembrete/notificação de evento próximo para interessados | P2 |
| RF-30 | Exibir eventos em visão de calendário mensal, além da lista | P2 |

### 5.8 Diretório de servidores

| ID | Requisito | Pri |
|---|---|---|
| RF-31 | Buscar servidor por nome, cargo/função ou unidade | Implementado (mock) |
| RF-32 | Exibir e-mail, ramal e localização de trabalho do servidor, quando aplicável | Implementado (mock) |
| RF-33 | Buscar por unidade, exibindo estrutura, responsável e equipe | P1 |
| RF-34 | Alimentar o diretório a partir da base de servidores/unidades já usada pelo Helpdesk, não de cadastro duplicado | P1 |

### 5.9 Perfil do servidor

| ID | Requisito | Pri |
|---|---|---|
| RF-35 | Exibir nome, função, unidade, e-mail, ramal e local | Implementado (mock) |
| RF-36 | Permitir descrição opcional sobre a atuação profissional | P2 |
| RF-37 | Exibir reconhecimentos (Kudos) recebidos, quando o servidor optar por exibir | P2 |
| RF-38 | Página de preferências de notificação (seção 5.10) | P1 |

### 5.10 Notificações

| ID | Requisito | Pri |
|---|---|---|
| RF-39 | Notificar sobre: comentários e respostas, Kudos recebidos, comunicados importantes, lembretes de evento, aniversários, conteúdo novo da unidade | Parcial (UI mock implementada; eventos ainda não geram notificação real) |
| RF-40 | Permitir ao servidor configurar preferências por tipo de notificação | P2 |
| RF-41 | Persistir notificações e marcar como lidas/não lidas | P0 |

### 5.11 Busca global

| ID | Requisito | Pri |
|---|---|---|
| RF-42 | Buscar simultaneamente publicações, comunicados, pessoas e unidades | Implementado (mock, escopo parcial) |
| RF-43 | Agrupar resultados por categoria (publicações, pessoas, unidades) | P1 |
| RF-44 | Estender a busca para documentos, FAQ, sistemas e procedimentos quando esses módulos existirem | P3 (depende de módulos futuros) |

### 5.12 Governança e administração

| ID | Requisito | Pri |
|---|---|---|
| RF-45 | Painel de administração para gerenciar perfis de publicação por usuário/unidade | P1 |
| RF-46 | Moderar (ocultar/remover) publicações e comentários, com registro de motivo | P1 |
| RF-47 | Auditar quem publicou, editou ou removeu cada conteúdo | P1 |

---

## 6. Regras de negócio

### Publicação e governança

- **RN-01** Perfil, unidade e cargo do usuário nunca são cadastrados manualmente na intranet: vêm da mesma base de identidade/autorização usada pelo Helpdesk (`lib/permissoes.ts`). A intranet consome essa base, não a duplica.
- **RN-02** O tipo de publicação disponível para o usuário é determinado pelo seu perfil (seção 3), verificado **no servidor**, nunca apenas ocultando opções na UI.
- **RN-03** Comunicado fixado no topo tem prazo de expiração ou remoção manual — não pode acumular indefinidamente.
- **RN-04** Segmentação de comunicado restringe visibilidade: um servidor só vê comunicados destinados à SMUL inteira, à sua unidade, ao seu perfil ou a ele especificamente.
- **RN-05** Exclusão de publicação é lógica (soft delete), preservando autor, data e motivo para auditoria.

### Kudos e privacidade

- **RN-06** Kudos não gera ranking, pontuação comparativa ou lista ordenada de "mais reconhecidos". Qualquer agregação é só para o próprio servidor ver o que recebeu.
- **RN-07** Aniversário só aparece no card diário e no perfil se o servidor não tiver optado por ocultá-lo (opt-out, não opt-in — mas reversível a qualquer momento).
- **RN-08** Dados pessoais sensíveis (endereço residencial, telefone pessoal) não são exibidos no diretório nem no perfil — apenas contato funcional (e-mail, ramal), mesma restrição já aplicada no sistema de Teletrabalho (RN-26 daquele documento).

### Notificações

- **RN-09** Notificação é gerada no evento de origem (comentário, kudos, publicação de comunicado etc.) e entregue de forma assíncrona — a criação do conteúdo nunca deve falhar por causa de uma falha ao notificar.
- **RN-10** Preferências de notificação são por tipo, não um único interruptor geral.

---

## 7. Requisitos não funcionais

### Segurança

| ID | Requisito | Pri |
|---|---|---|
| RNF-01 | Autenticação obrigatória para acesso à intranet, reaproveitando o SSO/sessão já usados pelo restante do sistema | P0 |
| RNF-02 | Perfil e permissões de publicação nunca derivados de dado enviado pelo cliente; sempre resolvidos no servidor | P0 |
| RNF-03 | Toda rota de API da intranet protegida por middleware de autenticação e autorização por perfil | P0 |
| RNF-04 | Validação de payload no servidor em todas as rotas de escrita (publicação, comentário, comunicado) | P0 |

### Dados e integridade

| ID | Requisito | Pri |
|---|---|---|
| RNF-05 | Substituir os módulos `_mock/*` por persistência real (Prisma + banco) mantendo os mesmos contratos de tipo (`_types/intranet.ts`) sempre que possível, para minimizar retrabalho na UI | P0 |
| RNF-06 | Índices em campos de busca (autor, unidade, data, tipo de publicação) | P1 |
| RNF-07 | Integridade referencial entre publicação, servidor e unidade via chave estrangeira | P0 |

### Desempenho e operação

| ID | Requisito | Pri |
|---|---|---|
| RNF-08 | Feed e listagens paginados no servidor; nenhuma tela carrega a base completa | P1 |
| RNF-09 | Interface responsiva e acessível (contraste, navegação por teclado) | P2 |
| RNF-10 | Idioma pt-BR; datas em `dd/mm/aaaa`; fuso `America/Sao_Paulo` | P1 |

### Arquitetura

- **Frontend/Backend:** Next.js (App Router) + TypeScript, reaproveitando o route group `(intranet)` já existente
- **ORM/Banco:** Prisma + MySQL, seguindo o padrão de `prisma/schema/helpdesk.prisma` (schema próprio `intranet.prisma`, evitar migração de shadow DB quebrada — ver memória de projeto sobre Prisma Migrations)
- **Autenticação:** mesma sessão/SSO usada pelo Helpdesk
- **Componentes:** reaproveitar `components/sidebar/*` e primitives de UI já usados no restante do sistema

---

## 8. Entidades do modelo de dados (núcleo)

| Entidade | Observação |
|---|---|
| `IntranetPublicacao` | Substitui `IntranetPost` mock; tipo, autor, unidade, segmentação, texto, mídia |
| `IntranetComentario` | N:1 com publicação |
| `IntranetCurtida` | N:N servidor × publicação |
| `IntranetComunicado` | Especialização de publicação com leitura obrigatória, fixação e segmentação |
| `IntranetLeituraComunicado` | Servidor × comunicado, com data de leitura/confirmação |
| `IntranetKudos` | Remetente, destinatário, categoria, mensagem, visibilidade |
| `IntranetConquista` | Unidade, servidores envolvidos, descrição |
| `IntranetEvento` | Data, horário, local, categoria, responsável |
| `IntranetInteresseEvento` | Servidor × evento |
| `IntranetNotificacao` | Destinatário, tipo, origem, lida/não lida |
| `IntranetPreferenciaNotificacao` | Servidor × tipo de notificação, habilitado |
| `IntranetAniversarioOptOut` | Servidor que optou por ocultar aniversário |

`Servidor` e `Unidade` **não** são recriados — referenciam as entidades já existentes na base compartilhada com Helpdesk (`lib/permissoes.ts`, `prisma/schema/helpdesk.prisma`).

---

## 9. Premissas e restrições

- A base de servidores, unidades e permissões é compartilhada com o Helpdesk; a intranet não cria um cadastro de pessoas paralelo.
- O protótipo atual (`_mock/*`) é ponto de partida de UI/UX, não de dados — todo conteúdo mock será substituído por dados reais na Fase 1.
- ASCOM é o único perfil com acesso ao formato editorial completo (notícia com galeria/vídeo); esse formato em si (área "Comunicação > Notícias") é tratado como extensão da Fase 1, não do núcleo mínimo.

---

## 10. Fora de escopo (deste documento)

Tratados como módulos ou fases futuras, com requisitos próprios quando chegar a vez:

- **Reserva de salas** — módulo já citado pelo usuário como próximo passo após o núcleo da intranet.
- **Central de TI / Helpdesk** — já existe como sistema completo (`app/(rotas-auth)/helpdesk`); a intranet apenas linka para ele (atalho e card de suporte), sem reconstruir chamados/base de conhecimento aqui.
- **Inventário** — já existe como módulo próprio; fora de escopo.
- **Área dedicada da CIPA** (campanhas, materiais, SIPAT, membros, canal de contato) — fica como card/atalho na Fase 1; área completa é módulo futuro.
- **Central do Servidor** (atalhos para Portal do Servidor, holerite, SEI, SIMPROC, Aprova Digital, GeoSampa, GLPI, Webmail, Teams, formulários, manuais, modelos, legislação, FAQ) — módulo futuro.
- **Organograma interativo** — módulo futuro (fase 2 da intranet).
- **Enquetes** — módulo futuro.
- **Galeria / SMUL em Fotos** — módulo futuro.
- **Vagas internas** como fluxo completo (hoje é apenas um tipo de publicação no feed) — evoluir para módulo com candidatura é fase futura.
- **App móvel nativo** — fora de escopo em qualquer fase próxima.

---

## 11. Roadmap

| Fase | Conteúdo | Requisitos |
|---|---|---|
| **1 — Layout e núcleo** (este documento) | Navegação reorganizada, feed real, comunicados, aniversários, kudos, conquistas, eventos (lista), diretório, perfil, notificações, busca, persistência e segurança P0 | RF-01 a RF-47, RNF-01 a RNF-10 |
| **2 — Interação e conteúdo avançado** | Notícias/ASCOM completas, calendário de eventos, organograma interativo, preferências finas de notificação | RF-30, RF-44 e extensões de RF-05/RF-06 |
| **3 — Módulos de serviço** | Reserva de salas, Central do Servidor, CIPA como área dedicada, Enquetes, Galeria | Documentos de requisitos próprios por módulo |
| **4 — Inteligência e métricas** | Busca ampliada a documentos/FAQ/sistemas, painel de engajamento (acessos, leitura de comunicados, participação em eventos) | RF-44 (completo), métricas |

---

## 12. Questões em aberto

1. A base de servidores/unidades/permissões do Helpdesk cobre 100% do quadro da SMUL, ou a intranet precisa de servidores que não abrem chamado (logo, ainda não cadastrados)?
2. Quem define e mantém os perfis de publicação (Administrador manualmente, ou herdado de cargo/unidade automaticamente)?
3. Comunicado com confirmação de leitura obrigatória bloqueia o acesso a outras áreas da intranet até ser lido, ou é apenas indicador para a chefia?
4. Kudos deve ter algum limite (ex.: por mês) para evitar uso trivial, ou é irrestrito?
5. A reorganização do menu (RF-01) pode quebrar links/rotas já divulgados do protótipo atual? Precisa de redirecionamento?
6. Notícias da ASCOM (formato editorial completo) entram na Fase 1 ou ficam de fato para a Fase 2, como sugerido na seção 9?
