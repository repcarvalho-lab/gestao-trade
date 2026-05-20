import { prisma } from './src/lib/prisma'

async function run() {
  const user = await prisma.user.findFirst()
  if (!user) return console.log("No user")
  const dias = await prisma.tradingDay.findMany({
    where: { userId: user.id },
    orderBy: { date: 'asc' },
    select: { date: true, capitalFinal: true }
  })
  console.log(dias)
}

run().catch(console.error).finally(() => prisma.$disconnect())
