CREATE TABLE "Estrategia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estrategia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Estrategia_userId_nome_key" ON "Estrategia"("userId", "nome");

ALTER TABLE "Estrategia" ADD CONSTRAINT "Estrategia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
