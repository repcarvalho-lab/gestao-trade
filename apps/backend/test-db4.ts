import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const dia = await prisma.tradingDay.findFirst({ orderBy: { date: 'asc' } })
  console.log('Primeiro dia:', dia)
}
main().catch(console.error).finally(() => prisma.$disconnect())
