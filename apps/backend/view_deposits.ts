import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const aportes = await prisma.aportePlanejado.findMany({ where: { userId: user.id } });
    const depositos = await prisma.depositoSaque.findMany({ where: { userId: user.id, tipo: 'DEPOSITO' } });
    console.log(`User: ${user.email}`);
    console.log(`Aportes Planejados:`, aportes);
    console.log(`Depositos:`, depositos);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
