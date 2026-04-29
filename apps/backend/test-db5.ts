import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const config = await prisma.configuration.findFirst()
  console.log('Config:', config)
}
main().catch(console.error).finally(() => prisma.$disconnect())
