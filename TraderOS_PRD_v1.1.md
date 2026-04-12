# TraderOS — Product Requirements Document

**Versão:** 1.1  
**Data:** Abril 2026  
**Status:** Aprovado — pronto para desenvolvimento  
**Audiência:** Agente desenvolvedor (Claude Code)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Usuários e Personas](#2-usuários-e-personas)
3. [Regras de Negócio Core](#3-regras-de-negócio-core)
4. [Módulos do Sistema](#4-módulos-do-sistema)
5. [Fluxos Críticos](#5-fluxos-críticos)
6. [Stack Técnico](#6-stack-técnico)
7. [Autenticação e Segurança](#7-autenticação-e-segurança)
8. [Modelo de Dados](#8-modelo-de-dados)
9. [Fases e Roadmap](#9-fases-e-roadmap)
10. [Requisitos Não Funcionais](#10-requisitos-não-funcionais)
11. [Critérios de Aceite — Fase 1](#11-critérios-de-aceite--fase-1)

---

## 1. Visão Geral

### 1.1 Problema

O trader opera opções binárias com estratégia de Martingale (ENTR → MG1 → MG2 opcional) e hoje gerencia toda a lógica em uma planilha Excel manual. A planilha resolve o problema, mas não escala:

- Não oferece interface operacional em tempo real durante o pregão
- Não alerta sobre limites (metas, stops, ciclos) enquanto opera
- Não registra o motivo/contexto de cada entrada
- Exige atualização manual de fórmulas a cada dia

### 1.2 Proposta de Valor

O **TraderOS** substitui a planilha por um sistema web completo que:

- Opera como painel de controle em tempo real durante o pregão
- Aplica automaticamente todas as regras de negócio (ciclos, metas, stops, martingale)
- Registra o contexto de cada entrada (motivo, tipo, valor) e o resultado ao fechar a vela
- Consolida: operação → dia → semana → mês → projeção anual
- É construído para evoluir de aplicação local (Fase 1) a produto multi-tenant (Fase 2)

### 1.3 O Que NÃO É

- ❌ Não é plataforma de execução de ordens (não envia ordens à corretora)
- ❌ Não é robô/bot de trading automatizado
- ❌ Não possui integração com corretora na Fase 1
- ❌ Não gera sinais ou análises de mercado

---

## 2. Usuários e Personas

| Atributo | Fase 1 — Trader Solo | Fase 2 — Trader Externo |
|---|---|---|
| Perfil | Único usuário da aplicação local | Qualquer trader com conta própria |
| Acesso | `localhost` — autenticação simplificada | Login com MFA via OTP e-mail |
| Parâmetros | Configuráveis via tela de Configurações | Isolados por conta (multi-tenant) |
| Role | `admin` | `admin` ou `user` |
| Corretora | Ebinex (registro manual) | Ebinex via API (Fase 2) |

---

## 3. Regras de Negócio Core

> ⚠️ **Importante para o agente:** Toda lógica desta seção foi extraída e validada a partir da planilha `Planilha_de_Trades.xlsx`. Não hardcode nenhum valor — todos os parâmetros são configuráveis pelo usuário.

### 3.1 Parâmetros Globais (Configurações)

Todos os parâmetros abaixo são editáveis na tela de **Configurações**. O banco deve armazená-los na entidade `Configuration` (ver Seção 8).

| Parâmetro | Padrão | Descrição |
|---|---|---|
| `metaIdealPct` | 2% | Percentual do capital do dia que define a meta mínima. Ao atingir, pode encerrar o dia. |
| `metaMaximaPct` | 3% | Meta bônus — não obrigatório encerrar ao atingi-la. |
| `stopDiarioPct` | 6% | Percentual máximo de perda no dia. Ao atingir, status → STOP. |
| `riscoMaxCicloPct` | 6% | Percentual do capital comprometido no ciclo. Usado para comparar entradas reais vs sugeridas. |
| `pctSugeridaEntrada` | 2% | Base para calcular o valor sugerido de entrada (aplicado sobre o capital inicial do dia). |
| `fatorMG1` | 2x | Multiplicador do valor de ENTR para calcular o valor de MG1. |
| `fatorMG2` | 2x | Multiplicador do valor de MG1 para calcular o valor de MG2. |
| `mg2Habilitado` | false | Toggle global: define se MG2 está disponível como opção de entrada. |
| `tradesporCiclo` | 2 ou 3 | Calculado: 2 quando MG2 desabilitado (ENTR + MG1), 3 quando MG2 habilitado (ENTR + MG1 + MG2). |
| `maxEntradasPorCiclo` | 3 | Número máximo de entradas por ciclo quando MG2 está habilitado. Editável. |
| `maxCiclosPorDia` | 3 | Limite comportamental de ciclos por dia. |
| `maxTradesPorDia` | 9 | Calculado: `maxEntradasPorCiclo × maxCiclosPorDia`. |
| `payout` | 90% | Percentual de retorno da corretora sobre ganhos. `resultadoWin = valorEntrada × payout`. |
| `cambiCompra` | 5.20 | Taxa de câmbio aplicada em **depósitos** (trader envia dinheiro à corretora). |
| `cambioVenda` | 4.80 | Taxa de câmbio aplicada em **saques** (trader retira dinheiro da corretora). Usada apenas no módulo Depósitos e Saques. |
| `retornoConservador` | 20% | Cenário de projeção mensal conservadora. Editável. |
| `retornoRealista` | 40% | Cenário de projeção mensal realista. Editável. |
| `retornoAgressivo` | 60% | Cenário de projeção mensal agressivo. Editável. |
| `aporteJunho` | — | Valor de aporte planejado para junho (US$). |
| `saqueMinimo` | — | Saque mínimo desejado a partir de agosto (US$). |
| `saqueMaximo` | — | Saque máximo desejado a partir de agosto (US$). |

### 3.2 Lógica de Ciclo e Martingale

#### Estrutura de um Ciclo

```
ENTR → [MG1 se LOSS] → [MG2 se LOSS e mg2Habilitado = true]
```

#### Encerramento de Ciclo

Um ciclo é encerrado quando ocorre **uma** das condições:

1. **WIN** em qualquer nível (ENTR, MG1 ou MG2)
2. **Stop do ciclo atingido:** loss em MG1 quando MG2 está desabilitado, ou loss em MG2 quando MG2 está habilitado
3. **Encerramento manual** pelo trader

#### Cálculo de Valores

```
valorENTR  = pctSugeridaEntrada × capitalInicialReal
valorMG1   = valorENTR × fatorMG1
valorMG2   = valorMG1 × fatorMG2

resultadoWIN  = +valorEntrada × payout
resultadoLOSS = -valorEntrada
```

> Os valores de MG1 e MG2 são **pré-preenchidos** no Painel do Dia com base nas configurações, mas podem ser **editados pelo trader** antes de confirmar a operação.

### 3.3 Status do Dia

Calculado em tempo real. Atualiza a cada operação registrada.

| Status | Condição | Cor do Alerta |
|---|---|---|
| `OPERANDO` | Resultado do momento entre 0 e Meta Ideal | Neutro |
| `META_IDEAL` | Resultado >= Meta Ideal ($) | 🟢 Verde |
| `META_MAXIMA` | Resultado >= Meta Máxima ($) | 🟢 Verde escuro |
| `ATENCAO` | Resultado negativo, mas acima do Stop Diário | 🟡 Amarelo |
| `STOP` | Resultado <= Stop Diário ($) | 🔴 Vermelho piscante |

> **Regra adicional:** Quando > 70% do stop diário já foi consumido, exibir alerta amarelo de "Stop próximo" mesmo que o status ainda seja `OPERANDO`.

### 3.4 Alertas Visuais em Tempo Real

Todos os alertas são **visuais** — mudança de cor, badge e destaque na interface. Sem som ou push na Fase 1.

| Evento | Comportamento Visual |
|---|---|
| Meta Ideal atingida | Badge verde, indicadores em verde |
| Meta Máxima atingida | Badge verde escuro |
| Stop > 70% consumido | Badge amarelo, indicadores em amarelo |
| Stop Diário atingido | Badge vermelho piscante, bloquear nova entrada |
| Ciclos do dia esgotados | Badge laranja |

### 3.5 Motivos de Entrada

Cada operação registra o motivo da entrada. Os motivos são **cadastráveis e editáveis** nas Configurações (CRUD). Exemplos de valores iniciais:

- Live (seguiu orientação de live)
- IA (seguiu sinal de inteligência artificial)
- Setup próprio (estratégia pessoal)
- Outro (campo livre de texto)

> Motivos nunca são deletados fisicamente — apenas desativados (`ativo = false`) para preservar o histórico de operações antigas.

---

## 4. Módulos do Sistema

### 4.1 Configurações

Tela administrativa com todos os parâmetros globais. Organizada em grupos:

- **Estratégia:** metas, stops, fatores MG, ciclos, toggle MG2
- **Financeiro:** payout, câmbio compra/venda, aporte planejado, saques desejados
- **Projeção:** retornos conservador/realista/agressivo (editáveis)
- **Motivos de Entrada:** CRUD — adicionar, editar, desativar

---

### 4.2 Painel do Dia (Tela Operacional)

> 🎯 **Módulo mais crítico.** Permanece aberta durante o pregão e atualiza todos os indicadores em tempo real (< 300ms) após cada operação registrada.

#### 4.2.1 Bloco de Resumo do Dia

Exibe em tempo real, apenas em **US$**:

- Saldo Atual (US$)
- Capital Inicial do Dia (US$)
- Depósito / Saque do Dia — **campo de entrada editável**; valor reflete automaticamente no Controle Diário e recalcula o Capital Total Inicial do dia
- Capital Total Inicial (= Capital Inicial + Depósito/Saque)
- Valor Sugerido de Entrada (calculado: `pctSugeridaEntrada × capitalInicialReal`)
- Resultado do Momento (US$)
- Rentabilidade (%)
- Meta Ideal ($) e Meta Máxima ($)
- Stop Financeiro ($)
- Falta para Meta ($)
- Espaço Antes do Stop ($)
- Ciclos Realizados / Ciclos Restantes
- Status do Stop de Ciclos
- **Badge de Status do Dia** — colorido conforme Seção 3.3
- **Toggle: MG2 habilitado hoje?** — afeta validação e cálculo de entradas no ciclo

#### 4.2.2 Registro de Operações (Fluxo ao Vivo)

O trader registra cada operação manualmente. Fluxo obrigatório:

1. Seleciona o **tipo**: `ENTR`, `MG1` ou `MG2`
   - `MG2` só disponível se `mg2Habilitado = true`
2. Informa o **ativo** (campo livre ou select; ex: `ETH/USDT`, `BTC/USDT`)
3. Confere/edita o **valor de entrada** (pré-preenchido pelo sistema)
4. Seleciona o **motivo de entrada** (lista cadastrada; inclui "Outro" com campo livre)
5. Confirma — operação criada com `status = ABERTA`
6. Quando a vela fecha: trader marca **WIN** ou **LOSS**
7. Sistema calcula resultado automaticamente e atualiza todos os indicadores

> O sistema deve **sugerir o tipo da próxima entrada** baseado no resultado: LOSS em ENTR → sugerir MG1; LOSS em MG1 → sugerir MG2 (se habilitado).

#### 4.2.3 Tabela de Operações do Dia

Listagem ao vivo com colunas:

`Nº` | `Ciclo` | `Tipo` | `Ativo` | `Valor ($)` | `Motivo` | `Status` | `Resultado ($)`

#### 4.2.4 Fechamento do Dia

Acionado manualmente pelo trader. Ao clicar em "Fechar Dia":

1. Modal exibe campos de fechamento: **Emocional** (texto livre ou escala) e **Seguiu Setup?** (sim/não)
2. Trader preenche e confirma
3. Sistema consolida todos os dados no **Controle Diário**
4. Capital Final do dia torna-se Capital Inicial do próximo dia
5. Painel é resetado (operações zeradas, ciclos zerados)
6. Dashboard e resumos são atualizados automaticamente

---

### 4.3 Controle Diário

Registro histórico de todos os dias operados. Permite visualização e edição retroativa.

| Campo | Origem |
|---|---|
| Data e Dia da Semana | Automático |
| Capital Inicial / Capital Total Inicial | Automático (carry-over do dia anterior) |
| Depósito / Saque do Dia | Preenchido automaticamente a partir do campo no Painel do Dia |
| Sugestão Vl. de Entrada | Calculado a partir das configurações (`pctSugeridaEntrada × capitalInicialReal`) |
| Vl. Entrada Real | Registrado automaticamente a partir do Painel do Dia |
| VL MG1 / VL MG2 | Pré-preenchidos no Painel do Dia (editáveis pelo trader); consolidados automaticamente |
| Usou MG2? | Registrado no Painel do Dia |
| Nº Trades, Win, Loss, Taxa de Acerto | Consolidado das operações do dia |
| Quantos Ciclos / Respeitou Limite? | Consolidado + comparação com `maxCiclosPorDia` |
| Capital Final / Resultado / Rentabilidade | Calculado |
| Meta Ideal e Máxima ($) / Atingidas? | Calculado |
| Status do Dia | Derivado das regras da Seção 3.3 |
| Stop (6%) / Stop Atingido? | Calculado |
| Risco Max Ciclo ($) e (%) / Respeitou? | Calculado e comparado |
| Sequência Negativa | Contagem automática de dias consecutivos negativos |
| Emocional / Seguiu Setup? | Preenchido no fechamento do dia |

---

### 4.4 Dashboard

Visão consolidada e gráfica de toda a performance. Atualiza automaticamente ao fechar cada dia.

#### Indicadores Globais
- Dias operados / Dias positivos
- Lucro total (US$)
- Último capital (US$)
- Taxa de acerto geral
- Maior gain e maior loss (US$)

#### Indicadores Financeiros
- Aporte planejado (US$)
- Saque mínimo e máximo desejados (US$)
- Alerta de sustentabilidade do saque

#### Gráficos (Recharts)
- **Evolução do capital** ao longo do tempo — gráfico de linha
- **Resultado diário** — barras (positivo = verde, negativo = vermelho)
- **Taxa de acerto semanal** — barras agrupadas
- **Realizado vs. Projeção** — linha multi-série (conservadora / realista / agressiva)

> Todos os valores no Dashboard são exibidos em **US$** apenas.

---

### 4.5 Projeção Anual

Cálculo mês a mês com base nos três cenários de retorno. Todos os valores em **US$**.

**Lógica de cálculo por mês:**

```
capitalInicial[mes] = capitalFinal[mes-1] + aporte[mes]
capitalFinal[mes]   = capitalInicial[mes] × (1 + retorno[cenario]) - saque[mes]
saqueSustentavel    = max valor retirável sem comprometer o crescimento
saqueViavel         = "OK" se capitalFinal >= threshold | "SEM SAQUE" caso contrário
```

- Aportes e saques configuráveis por mês
- Saques ativados a partir do mês configurado (padrão: Agosto)
- Exibe os três cenários lado a lado: Conservador / Realista / Agressivo

---

### 4.6 Depósitos e Saques

CRUD de movimentações financeiras. **Único módulo onde valores em R$ são exibidos.**

**Campos:**

| Campo | Detalhe |
|---|---|
| Data | Date picker |
| Tipo | `DEPOSITO` ou `SAQUE` |
| Valor (US$) | Input numérico |
| Câmbio aplicado | Pré-preenchido: `cambioCompra` para depósitos, `cambioVenda` para saques. Editável por transação. |
| Valor (R$) | Calculado: `valorUSD × cambio` |
| Mês | Derivado da data |
| Observação | Texto livre |
| Faixa planejada | Referência à projeção (ex: "mínimo", "máximo") |

**Regras:**
- Depósitos incrementam o capital do próximo dia operacional
- Saques decrementam o capital

---

### 4.7 Resumos Semanais e Mensais

Consolidações automáticas geradas no fechamento de cada dia — nunca manuais.

**Resumo Semanal** (segunda a domingo):

`Semana` | `Data Inicial` | `Data Final` | `Dias Operados` | `Dias Positivos` | `Dias Negativos` | `Win` | `Loss` | `Taxa de Acerto` | `Lucro ($)` | `Melhor Dia` | `Pior Dia`

**Resumo Mensal:**

`Mês` | `Capital Inicial` | `Capital Final` | `Lucro Total ($)` | `Rentab. Total` | `Rentab. Média` | `Retorno: Cons./Real./Agr.` | `Taxa Acerto Média` | `Maior Gain` | `Maior Loss` | `Vl Depositado/Sacado`

---

## 5. Fluxos Críticos

### 5.1 Fluxo de Uma Operação ao Vivo

```
1. Trader abre o Painel do Dia
2. Sistema exibe: Capital Inicial, Valor Sugerido, Status: OPERANDO
3. Trader clica em "Nova Operação"
4. Seleciona tipo: ENTR | MG1 | MG2 (MG2 só se mg2Habilitado = true)
5. Valor pré-preenchido conforme configurações — trader pode editar
6. Seleciona motivo de entrada
7. Confirma → operação status = ABERTA
8. Vela fecha → trader marca WIN ou LOSS
9. Sistema calcula resultado, atualiza capital e todos os indicadores
10a. WIN → ciclo encerrado, contadores de ciclos atualizados
10b. LOSS + MG1 disponível → sistema sugere próxima entrada como MG1
10c. LOSS + fim do ciclo (stop de ciclo) → ciclo encerrado como FECHADO_STOP
11. Badge de status do dia atualizado com cor correspondente
```

### 5.2 Fluxo de Fechamento do Dia

```
1. Trader clica em "Fechar Dia"
2. Modal: campos "Emocional" e "Seguiu Setup?" (obrigatórios para fechar)
3. Trader preenche e confirma
4. Sistema consolida todos os dados → cria registro no Controle Diário
5. capitalFinal do dia → capitalInicial do próximo dia
6. Painel resetado (operações e ciclos zerados)
7. Dashboard e resumos recalculados automaticamente
8. Usuário redirecionado para Controle Diário
```

---

## 6. Stack Técnico

### Frontend

| Tecnologia | Versão / Uso |
|---|---|
| React | 18 |
| TypeScript | Obrigatório em todo o frontend |
| Vite | Build tool e dev server |
| React Router | Navegação entre módulos |
| Zustand | Estado global (capital, ciclos, configurações) |
| Axios | Chamadas HTTP ao backend |
| shadcn/ui + Tailwind CSS | Componentes e sistema de design |
| Recharts | Gráficos de performance e projeção |

### Backend

| Tecnologia | Uso |
|---|---|
| Node.js + Express | Runtime e framework HTTP |
| TypeScript | Obrigatório em todo o backend |
| Prisma ORM | Acesso ao banco + migrações versionadas |
| JWT | Autenticação — access token (curta duração) + refresh token |
| bcrypt | Hash de senhas |
| nodemailer | Envio de OTP por e-mail (MFA — Fase 2) |
| exceljs | Exportação .xlsx — **backlog, não implementar na Fase 1** |

### Banco de Dados

| Tecnologia | Detalhe |
|---|---|
| PostgreSQL 16 | Banco principal |
| Prisma Migrations | Versionamento do schema — portável entre ambientes |

### Infraestrutura

| Componente | Função |
|---|---|
| Docker + Docker Compose | Containerização: frontend, backend, PostgreSQL |
| Nginx | Proxy reverso + servir frontend (produção) |
| Let's Encrypt via Certbot | SSL — apenas Fase 2 |
| Cloudflare | DNS + DDNS via script cron com API — apenas Fase 2 |
| GitHub | Branches: `main` (QA/Prod) e `develop` (Dev) |

### Ambientes

| Ambiente | Branch | Infraestrutura |
|---|---|---|
| Dev | `develop` | Docker Compose local — MacBook Air M4 |
| QA | `main` | Docker Compose local — portas separadas do Dev |
| Produção (Fase 2) | `main` | Oracle Cloud Free Tier + Nginx + SSL |

---

## 7. Autenticação e Segurança

### 7.1 Fluxo de Autenticação (Fase 2)

- Login com e-mail e senha
- MFA via OTP de 6 dígitos enviado por e-mail (validade: 10 minutos)
- Sessões confiáveis por 30 dias via device fingerprint (não solicita MFA novamente)
- Access Token (curta duração) + Refresh Token (longa duração)

### 7.2 Fase 1 — Simplificação Local

Na Fase 1 (`localhost`), a autenticação pode ser simplificada: usuário único, sem MFA obrigatório.

> ⚠️ **Importante:** Implementar a estrutura de roles e tokens JWT **desde a Fase 1**, mesmo que não seja exigida por completo. Isso evita refatoração na migração para Fase 2.

### 7.3 Roles

| Role | Permissões |
|---|---|
| `admin` | Acesso total: configurações, CRUD completo, gestão de usuários (Fase 2), todos os módulos |
| `user` | Acesso operacional: Painel do Dia, Controle Diário, Dashboard, Depósitos e Saques. Sem acesso às Configurações globais. |

### 7.4 Regras de Segurança

- Senhas com `bcrypt`
- Tokens JWT com expiração — sem dados sensíveis em `localStorage`
- Sem JavaScript puro — TypeScript obrigatório em toda a stack

---

## 8. Modelo de Dados

### 8.1 Entidades

> ⚠️ **Arquitetura multi-tenant desde o início:** `userId` deve estar presente em todas as entidades principais, mesmo que na Fase 1 exista apenas um usuário.

#### `User`
```
id           String   @id @default(uuid())
email        String   @unique
passwordHash String
role         Role     @default(user)  // enum: admin | user
createdAt    DateTime @default(now())
```

#### `Configuration`
```
id                   String  @id @default(uuid())
userId               String  @unique
metaIdealPct         Float   @default(0.02)
metaMaximaPct        Float   @default(0.03)
stopDiarioPct        Float   @default(0.06)
riscoMaxCicloPct     Float   @default(0.06)
pctSugeridaEntrada   Float   @default(0.02)
fatorMG1             Float   @default(2)
fatorMG2             Float   @default(2)
mg2Habilitado        Boolean @default(false)
maxEntradasPorCiclo  Int     @default(3)
maxCiclosPorDia      Int     @default(3)
payout               Float   @default(0.90)
cambioCompra         Float   @default(5.20)
cambioVenda          Float   @default(4.80)
retornoConservador   Float   @default(0.20)
retornoRealista      Float   @default(0.40)
retornoAgressivo     Float   @default(0.60)
aporteJunho          Float?
saqueMinimo          Float?
saqueMaximo          Float?
user                 User    @relation(fields: [userId], references: [id])
```

#### `TradingDay`
```
id                    String   @id @default(uuid())
userId                String
date                  DateTime @unique  // apenas a data, sem horário
capitalInicial        Float    // carry-over do dia anterior
deposito              Float    @default(0)  // positivo = depósito, negativo = saque
capitalInicialReal    Float    // capitalInicial + deposito
capitalFinal          Float?
resultadoDia          Float?
rentabilidade         Float?
status                DayStatus  // enum: OPERANDO | META_IDEAL | META_MAXIMA | ATENCAO | STOP
usouMG2               Boolean  @default(false)
numeroTrades          Int      @default(0)
win                   Int      @default(0)
loss                  Int      @default(0)
taxaAcerto            Float?
ciclosRealizados      Int      @default(0)
respeitouLimiteCiclos Boolean?
emocional             String?
seguiuSetup           Boolean?
isClosed              Boolean  @default(false)
user                  User     @relation(...)
trades                Trade[]
ciclos                Ciclo[]
```

#### `Ciclo`
```
id             String      @id @default(uuid())
tradingDayId   String
numero         Int         // número sequencial no dia
status         CicloStatus // enum: ABERTO | FECHADO_WIN | FECHADO_STOP | FECHADO_MANUAL
totalInvestido Float       @default(0)
resultado      Float?
tradingDay     TradingDay  @relation(...)
trades         Trade[]
```

#### `Trade`
```
id           String      @id @default(uuid())
tradingDayId String
cicloId      String
tipo         TradeType   // enum: ENTR | MG1 | MG2
ativo        String      // ex: "ETH/USDT"
valor        Float
motivoId     String?
motivoOutro  String?     // texto livre quando motivo = "Outro"
status       TradeStatus // enum: ABERTA | WIN | LOSS
resultado    Float?      // calculado ao marcar WIN/LOSS
horario      DateTime    @default(now())
tradingDay   TradingDay  @relation(...)
ciclo        Ciclo       @relation(...)
motivo       MotivoEntrada? @relation(...)
```

#### `MotivoEntrada`
```
id     String  @id @default(uuid())
userId String
nome   String
ativo  Boolean @default(true)  // soft delete — nunca deletar fisicamente
user   User    @relation(...)
trades Trade[]
```

#### `DepositoSaque`
```
id             String          @id @default(uuid())
userId         String
data           DateTime
tipo           MovimentoTipo   // enum: DEPOSITO | SAQUE
valorUSD       Float
cambio         Float           // cambioCompra se DEPOSITO, cambioVenda se SAQUE
valorBRL       Float           // calculado: valorUSD × cambio
mes            String          // ex: "2026-06"
observacao     String?
faixaPlanejada String?
user           User            @relation(...)
```

#### `WeeklyReport`
```
id             String   @id @default(uuid())
userId         String
semana         Int      // número da semana ISO
dataInicial    DateTime
dataFinal      DateTime
diasOperados   Int
diasPositivos  Int
diasNegativos  Int
totalWin       Int
totalLoss      Int
taxaAcerto     Float
lucroTotal     Float
melhorDia      Float
piorDia        Float
```

#### `MonthlyReport`
```
id               String   @id @default(uuid())
userId           String
mes              String   // ex: "2026-04"
dataBase         DateTime
diasOperados     Int
diasPositivos    Int
diasNegativos    Int
capitalInicial   Float
vlDepositadoSacado Float
lucroTotal       Float
capitalFinal     Float
rentabMedia      Float
rentabTotal      Float
retornoClassif   String   // "CONSERVADOR" | "REALISTA" | "AGRESSIVO"
taxaAcertoMedia  Float
maiorGain        Float
maiorLoss        Float
```

### 8.2 Regras de Integridade

- Apenas **um** `TradingDay` com `isClosed = false` por usuário por vez
- `Trade` só pode ser criado em um `TradingDay` com `isClosed = false`
- `Ciclo` só pode ser `ABERTO` se o `TradingDay` também está aberto
- Ao fechar o dia: `capitalFinal = capitalInicialReal + resultadoDia`
- Capital inicial do próximo dia = `capitalFinal` do último dia fechado + depósitos/saques do novo dia
- `MotivoEntrada` nunca é deletado fisicamente — apenas `ativo = false`
- `WeeklyReport` e `MonthlyReport` são **recalculados** a cada fechamento de dia

---

## 9. Fases e Roadmap

### 9.1 Fase 1 — MVP Local

**Objetivo:** Substituir completamente a planilha para uso solo no MacBook Air M4.

| Módulo / Feature | Prioridade |
|---|---|
| Docker Compose completo (frontend + backend + PostgreSQL) | **P0 — Crítico** |
| Schema Prisma + migrations iniciais | **P0 — Crítico** |
| Configurações — todos os parâmetros + motivos de entrada (CRUD) | **P0 — Crítico** |
| Painel do Dia — registro manual de operações em tempo real | **P0 — Crítico** |
| Lógica de ciclos, martingale, metas e stops em tempo real | **P0 — Crítico** |
| Alertas visuais por status do dia | **P0 — Crítico** |
| Campo de Depósito/Saque no Painel do Dia | **P0 — Crítico** |
| Fechamento do Dia (emocional, seguiu setup, reset e carry-over) | **P0 — Crítico** |
| Controle Diário — listagem e edição histórica | **P0 — Crítico** |
| Dashboard — indicadores e gráficos | **P1 — Alta** |
| Projeção Anual — três cenários | **P1 — Alta** |
| Depósitos e Saques — CRUD com R$ | **P1 — Alta** |
| Resumo Semanal e Mensal — geração automática | **P1 — Alta** |
| Autenticação JWT básica (estrutura base, sem MFA obrigatório) | **P1 — Alta** |

### 9.2 Fase 2 — Produto Digital (Oracle Cloud)

| Feature | Descrição |
|---|---|
| Multi-tenant | Isolamento completo de dados por `userId` |
| MFA via OTP e-mail | Autenticação completa com sessões confiáveis por device fingerprint (30 dias) |
| Integração Ebinex API | Importação automática de operações da corretora |
| Deploy Oracle Free Tier | Nginx + SSL Let's Encrypt + Cloudflare DDNS |
| Exportação .xlsx | Geração de relatórios via `exceljs` (já no stack) |
| Gestão de Usuários (admin) | Painel para criar, editar e desativar contas |
| Notificações por e-mail | Alertas de stop e meta atingida (opcional) |

### 9.3 Backlog Futuro

- Exportação PDF de relatórios
- Integração com outras corretoras além da Ebinex
- App mobile (React Native reutilizando lógica de negócio)
- Notificações push mobile
- Análise de performance por motivo de entrada (IA vs. Live vs. Setup próprio)

---

## 10. Requisitos Não Funcionais

| Categoria | Requisito |
|---|---|
| **Performance** | Painel do Dia deve atualizar todos os indicadores em < 300ms após registro de resultado |
| **Confiabilidade** | Nenhuma operação registrada pode ser perdida — persistência imediata no banco antes de retornar sucesso ao frontend |
| **Usabilidade** | Fluxo de registro de operação deve ser completado em no máximo 5 cliques |
| **Responsividade** | Interface funciona em desktop e tablet (trader opera em tela grande) |
| **Portabilidade** | Docker Compose garante paridade total entre Dev, QA e Produção |
| **Segurança** | Senhas com `bcrypt`; tokens JWT com expiração; sem dados sensíveis em `localStorage` |
| **Manutenibilidade** | TypeScript obrigatório em toda a stack — zero JavaScript puro; Prisma migrations versionadas no repositório |
| **Escalabilidade** | `userId` em todas as entidades principais desde a Fase 1 — arquitetura multi-tenant pronta |

---

## 11. Critérios de Aceite — Fase 1

O sistema é considerado **pronto para uso em produção local** quando todos os cenários abaixo passarem na validação manual:

- [ ] **CA-01:** Registrar uma operação completa `ENTR → LOSS → MG1 → WIN` no Painel do Dia e verificar que capital, resultado, meta, stop e ciclos são atualizados corretamente em tempo real
- [ ] **CA-02:** Fechar um dia com preenchimento de emocional e "seguiu setup", e confirmar que o Controle Diário reflete todos os dados corretamente
- [ ] **CA-03:** Capital final do dia fechado vira capital inicial do próximo dia automaticamente (carry-over)
- [ ] **CA-04:** Alterar o `payout` nas Configurações e confirmar que os cálculos de resultado das novas operações mudam imediatamente
- [ ] **CA-05:** Simular atingimento do stop diário e verificar badge vermelho piscante + status `STOP`
- [ ] **CA-06:** Simular atingimento da meta ideal e verificar badge verde + status `META_IDEAL`
- [ ] **CA-07:** Com `mg2Habilitado = false`, confirmar que a opção MG2 não aparece disponível para cadastro de nova operação
- [ ] **CA-08:** Dashboard exibir gráfico de evolução de capital com dados dos últimos dias operados
- [ ] **CA-09:** Projeção anual calcular corretamente os três cenários com aporte configurado
- [ ] **CA-10:** Adicionar novo motivo de entrada nas Configurações e confirmá-lo disponível no seletor do Painel do Dia
- [ ] **CA-11:** Inserir depósito no campo do Painel do Dia e confirmar que o valor aparece automaticamente no Controle Diário e recalcula o Capital Total Inicial do dia
- [ ] **CA-12:** Cadastrar depósito em R$ no módulo Depósitos e Saques e confirmar que o câmbio `cambioCompra` foi aplicado automaticamente

---

*TraderOS PRD v1.1 — Confidencial — Abril 2026*
