import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const movs = await prisma.depositoSaque.findMany();
  console.log("Movimentos:", movs);
  const dias = await prisma.tradingDay.findMany();
  console.log("Dias:", dias);
}
main().catch(console.error).finally(() => prisma.$disconnect())
