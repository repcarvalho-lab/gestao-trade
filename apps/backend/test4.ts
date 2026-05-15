import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 're.pcarvalho@gmail.com' } })
  if (!user) return console.log('No user')
  const config = await prisma.configuration.findUnique({ where: { userId: user.id } })
  console.log('Config Keys:', Object.keys(config || {}))
}
main().finally(() => prisma.$disconnect())
