/*
  Warnings:

  - You are about to drop the column `aporteJunho` on the `Configuration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Configuration" DROP COLUMN "aporteJunho",
ADD COLUMN     "aporteMes" TEXT,
ADD COLUMN     "aporteValor" DOUBLE PRECISION,
ADD COLUMN     "saquesMesInicio" TEXT;
