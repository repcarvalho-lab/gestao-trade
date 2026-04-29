import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  if (users.length === 0) return;
  const userId = users[0].id;

  const days = await prisma.tradingDay.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  
  for (const day of days) {
    if (day.resultadoDia !== null && day.bancaGlobal && day.bancaGlobal > 0) {
      const newRentabilidade = day.resultadoDia / day.bancaGlobal;
      await prisma.tradingDay.update({
        where: { id: day.id },
        data: { rentabilidade: newRentabilidade }
      });
      console.log(`Updated day ${day.date.toISOString().slice(0,10)} rentabilidade to ${newRentabilidade.toFixed(4)}`);
    }
  }
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
