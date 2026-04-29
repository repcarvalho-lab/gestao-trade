import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const aportes = await prisma.aportePlanejado.findMany()
  console.log('Aportes:', aportes)
}
main().catch(console.error).finally(() => prisma.$disconnect())
