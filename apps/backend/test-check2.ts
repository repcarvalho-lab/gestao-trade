import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const dias = await prisma.tradingDay.findMany({ orderBy: { date: 'desc' }, take: 2 });
  console.log("Dias: ", dias.map(d => `Data: ${d.date.toISOString()}, DepositoCorr: ${d.deposito}, DepositoRes: ${(d as any).depositoReserva}`));
}
run().finally(() => prisma.$disconnect());
