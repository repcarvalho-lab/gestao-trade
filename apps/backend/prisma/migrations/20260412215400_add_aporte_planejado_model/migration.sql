-- CreateTable
CREATE TABLE "AportePlanejado" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AportePlanejado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AportePlanejado_userId_mes_key" ON "AportePlanejado"("userId", "mes");

-- AddForeignKey
ALTER TABLE "AportePlanejado" ADD CONSTRAINT "AportePlanejado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
