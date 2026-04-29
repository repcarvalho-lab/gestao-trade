import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const reports = await prisma.monthlyReport.findMany()
  console.log('Reports:', reports)
}
main().catch(console.error).finally(() => prisma.$disconnect())
