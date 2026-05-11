-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "dataSaldoInicial" TIMESTAMP(3),
ADD COLUMN     "saldoInicialCorretora" DOUBLE PRECISION,
ADD COLUMN     "saldoInicialReserva" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WeeklyReport" ADD COLUMN     "capitalFinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "capitalInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rentabTotal" DOUBLE PRECISION NOT NULL DEFAULT 0;

