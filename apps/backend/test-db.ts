import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const days = await prisma.tradingDay.findMany({ select: { date: true, capitalFinal: true, capitalInicialReal: true }, orderBy: { date: 'desc' }, take: 5 })
  const reports = await prisma.monthlyReport.findMany({ select: { mes: true } })
  const movs = await prisma.depositoSaque.findMany({ select: { data: true, valorUSD: true, tipo: true } })
  console.log('Days:', days)
  console.log('Reports:', reports)
  console.log('Movs:', movs)
}
main().catch(console.error).finally(() => prisma.$disconnect())
