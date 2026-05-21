-- CreateTable
CREATE TABLE "SignalHistory" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "exitPrice" DOUBLE PRECISION,
    "exitTime" TIMESTAMP(3),
    "mgLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalHistory_pkey" PRIMARY KEY ("id")
);

