import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const movs = await prisma.depositoSaque.findMany({ orderBy: { data: 'desc' }, take: 5 });
  console.log("Movimentos: ", movs.map(m => `Data: ${m.data.toISOString()}, USD: ${m.valorUSD}, BRL: ${m.valorBRL}, Conta: ${m.conta}, Tipo: ${m.tipo}`));

  const dias = await prisma.tradingDay.findMany({ orderBy: { date: 'desc' }, take: 2 });
  console.log("Dias: ", dias.map(d => `Data: ${d.date.toISOString()}, CapReal: ${d.capitalInicialReal}, Deposito: ${d.deposito}, Global: ${d.bancaGlobal}`));
}
run().finally(() => prisma.$disconnect());
