import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const movs = await prisma.depositoSaque.findMany()
  console.log("MOVS:", movs.map(m => ({ id: m.id, data: m.data, valor: m.valorUSD, tipo: m.tipo })))
  
  const config = await prisma.configuration.findFirst()
  console.log("CONFIG:", { cor: config?.saldoInicialCorretora, res: config?.saldoInicialReserva, data: config?.dataSaldoInicial })
  
  const dias = await prisma.tradingDay.findMany({ orderBy: { date: 'asc' } })
  console.log("DIAS:", dias.map(d => ({ data: d.date, capInit: d.capitalInicialReal, capFin: d.capitalFinal, dep: d.deposito, res: d.resultadoDia })))
}
main().catch(console.error).finally(() => prisma.$disconnect())
