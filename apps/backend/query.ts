import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const config = await prisma.configuration.findFirst()
  console.log("Config Saldo Inicial:", config?.saldoInicialCorretora)
  const movs = await prisma.depositoSaque.findMany()
  console.log("Movs:", movs.map(m => ({ data: m.data, valor: m.valorUSD, tipo: m.tipo })))
  const dias = await prisma.tradingDay.findMany({ orderBy: { date: 'asc' } })
  console.log("TradingDays:", dias.map(d => ({ date: d.date, init: d.capitalInicialReal, fin: d.capitalFinal, bg: d.bancaGlobal })))
}
main().catch(console.error).finally(() => prisma.$disconnect())
