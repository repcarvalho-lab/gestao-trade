import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function clean() {
  const user = await prisma.user.findFirst({
     include: {
        tradingDays: { orderBy: { date: 'desc' } }
     }
  })
  if (!user) return
  console.log("Trading Days:", user.tradingDays.map(d => ({ date: d.date, cap: d.capitalInicial, closed: d.isClosed })))
  
  // Find the one created by the test script today
  const testDay = user.tradingDays.find(d => d.capitalInicial === 100 && !d.isClosed)
  if (testDay) {
     await prisma.tradingDay.delete({ where: { id: testDay.id }})
     console.log("Deleted test day")
  }
}
clean().finally(() => prisma.$disconnect())
