import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('minhasenha123', 10)
  
  await prisma.user.updateMany({
    where: { email: 're.pcarvalho@gmail.com' },
    data: { passwordHash }
  })
  console.log('Senha resetada com sucesso para: minhasenha123')
}

main().finally(() => prisma.$disconnect())
