import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 're.pcarvalho@gmail.com' } })
  if (!user) return console.log('No user')
  const reports = await prisma.monthlyReport.findMany({ where: { userId: user.id }, orderBy: { dataBase: 'asc' } })
  console.log('Monthly Reports:', reports)
  const days = await prisma.tradingDay.findMany({ where: { userId: user.id }, orderBy: { date: 'asc' } })
  console.log('Trading Days:', days.map(d => ({ date: d.date, cInitial: d.capitalInicial, cFinal: d.capitalFinal, rDia: d.resultadoDia })))
}
main().finally(() => prisma.$disconnect())
