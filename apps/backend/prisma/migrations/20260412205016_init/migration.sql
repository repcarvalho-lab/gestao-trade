-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('OPERANDO', 'META_IDEAL', 'META_MAXIMA', 'ATENCAO', 'STOP');

-- CreateEnum
CREATE TYPE "CicloStatus" AS ENUM ('ABERTO', 'FECHADO_WIN', 'FECHADO_STOP', 'FECHADO_MANUAL');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('ENTR', 'MG1', 'MG2');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('ABERTA', 'WIN', 'LOSS');

-- CreateEnum
CREATE TYPE "MovimentoTipo" AS ENUM ('DEPOSITO', 'SAQUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metaIdealPct" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "metaMaximaPct" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
    "stopDiarioPct" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "riscoMaxCicloPct" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "pctSugeridaEntrada" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "fatorMG1" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "fatorMG2" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "mg2Habilitado" BOOLEAN NOT NULL DEFAULT false,
    "maxEntradasPorCiclo" INTEGER NOT NULL DEFAULT 3,
    "maxCiclosPorDia" INTEGER NOT NULL DEFAULT 3,
    "payout" DOUBLE PRECISION NOT NULL DEFAULT 0.90,
    "cambioCompra" DOUBLE PRECISION NOT NULL DEFAULT 5.20,
    "cambioVenda" DOUBLE PRECISION NOT NULL DEFAULT 4.80,
    "retornoConservador" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "retornoRealista" DOUBLE PRECISION NOT NULL DEFAULT 0.40,
    "retornoAgressivo" DOUBLE PRECISION NOT NULL DEFAULT 0.60,
    "aporteJunho" DOUBLE PRECISION,
    "saqueMinimo" DOUBLE PRECISION,
    "saqueMaximo" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "capitalInicial" DOUBLE PRECISION NOT NULL,
    "deposito" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capitalInicialReal" DOUBLE PRECISION NOT NULL,
    "capitalFinal" DOUBLE PRECISION,
    "resultadoDia" DOUBLE PRECISION,
    "rentabilidade" DOUBLE PRECISION,
    "status" "DayStatus" NOT NULL DEFAULT 'OPERANDO',
    "usouMG2" BOOLEAN NOT NULL DEFAULT false,
    "numeroTrades" INTEGER NOT NULL DEFAULT 0,
    "win" INTEGER NOT NULL DEFAULT 0,
    "loss" INTEGER NOT NULL DEFAULT 0,
    "taxaAcerto" DOUBLE PRECISION,
    "ciclosRealizados" INTEGER NOT NULL DEFAULT 0,
    "respeitouLimiteCiclos" BOOLEAN,
    "emocional" TEXT,
    "seguiuSetup" BOOLEAN,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ciclo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradingDayId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "CicloStatus" NOT NULL DEFAULT 'ABERTO',
    "totalInvestido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resultado" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ciclo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradingDayId" TEXT NOT NULL,
    "cicloId" TEXT NOT NULL,
    "tipo" "TradeType" NOT NULL,
    "ativo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "motivoId" TEXT,
    "motivoOutro" TEXT,
    "status" "TradeStatus" NOT NULL DEFAULT 'ABERTA',
    "resultado" DOUBLE PRECISION,
    "horario" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoEntrada" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotivoEntrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositoSaque" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "MovimentoTipo" NOT NULL,
    "valorUSD" DOUBLE PRECISION NOT NULL,
    "cambio" DOUBLE PRECISION NOT NULL,
    "valorBRL" DOUBLE PRECISION NOT NULL,
    "mes" TEXT NOT NULL,
    "observacao" TEXT,
    "faixaPlanejada" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositoSaque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semana" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "dataInicial" TIMESTAMP(3) NOT NULL,
    "dataFinal" TIMESTAMP(3) NOT NULL,
    "diasOperados" INTEGER NOT NULL DEFAULT 0,
    "diasPositivos" INTEGER NOT NULL DEFAULT 0,
    "diasNegativos" INTEGER NOT NULL DEFAULT 0,
    "totalWin" INTEGER NOT NULL DEFAULT 0,
    "totalLoss" INTEGER NOT NULL DEFAULT 0,
    "taxaAcerto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucroTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "melhorDia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "piorDia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "dataBase" TIMESTAMP(3) NOT NULL,
    "diasOperados" INTEGER NOT NULL DEFAULT 0,
    "diasPositivos" INTEGER NOT NULL DEFAULT 0,
    "diasNegativos" INTEGER NOT NULL DEFAULT 0,
    "capitalInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vlDepositadoSacado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lucroTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capitalFinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentabMedia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentabTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retornoClassif" TEXT NOT NULL DEFAULT 'CONSERVADOR',
    "taxaAcertoMedia" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maiorGain" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maiorLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_userId_key" ON "Configuration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradingDay_userId_date_key" ON "TradingDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_semana_ano_key" ON "WeeklyReport"("userId", "semana", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_userId_mes_key" ON "MonthlyReport"("userId", "mes");

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingDay" ADD CONSTRAINT "TradingDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ciclo" ADD CONSTRAINT "Ciclo_tradingDayId_fkey" FOREIGN KEY ("tradingDayId") REFERENCES "TradingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_tradingDayId_fkey" FOREIGN KEY ("tradingDayId") REFERENCES "TradingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "Ciclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoEntrada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotivoEntrada" ADD CONSTRAINT "MotivoEntrada_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositoSaque" ADD CONSTRAINT "DepositoSaque_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
