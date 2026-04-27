import { PrismaClient } from '@prisma/client'
import { excluirTrade } from './src/services/trades.service'

const prisma = new PrismaClient()

async function test() {
  const user = await prisma.user.findFirst()
  if (!user) return console.log("No user")
  const td = await prisma.tradingDay.create({
    data: {
      userId: user.id,
      date: new Date(),
      capitalInicial: 100,
      capitalInicialReal: 100,
    }
  })
  const ciclo = await prisma.ciclo.create({
    data: {
      userId: user.id,
      tradingDayId: td.id,
      numero: 1
    }
  })
  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      tradingDayId: td.id,
      cicloId: ciclo.id,
      tipo: 'ENTR',
      ativo: 'EUR/USD',
      valor: 10,
    }
  })
  console.log("Trade created", trade.id)
  await excluirTrade(trade.id, user.id)
  console.log("Trade excluded successfully")
}
test().catch(e => console.error("Error expected:", e)).finally(() => prisma.$disconnect())
