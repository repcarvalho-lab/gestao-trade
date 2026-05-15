import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 're.pcarvalho@gmail.com' } })
  if (!user) return console.log('No user')
  const movs = await prisma.depositoSaque.findMany({ where: { userId: user.id } })
  console.log('Movimentos:', movs)
}
main().finally(() => prisma.$disconnect())
