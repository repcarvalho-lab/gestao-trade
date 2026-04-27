-- CreateTable
CREATE TABLE "SaquePlanejado" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaquePlanejado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaquePlanejado_userId_mes_key" ON "SaquePlanejado"("userId", "mes");

-- AddForeignKey
ALTER TABLE "SaquePlanejado" ADD CONSTRAINT "SaquePlanejado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumns from Configuration
ALTER TABLE "Configuration" DROP COLUMN IF EXISTS "saqueMinimo";
ALTER TABLE "Configuration" DROP COLUMN IF EXISTS "saqueMaximo";
ALTER TABLE "Configuration" DROP COLUMN IF EXISTS "saquesMesInicio";
