import { prisma } from './apps/backend/src/lib/prisma'

async function check() {
  const movs = await prisma.depositoSaque.findMany();
  console.log('Depositos/Saques:', movs);
}

check().catch(console.error).finally(() => prisma.$disconnect());
