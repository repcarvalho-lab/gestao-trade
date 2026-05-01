import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c';

  await prisma.tradingDay.deleteMany({
    where: { userId, date: new Date('2026-04-30T12:00:00Z') }
  });

  await prisma.monthlyReport.deleteMany({
    where: { userId, mes: '2026-04' }
  });

  console.log('✅ Fake data removed');
}

main().catch(console.error).finally(() => prisma.$disconnect());
