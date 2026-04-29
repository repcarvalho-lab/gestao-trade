import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  if (users.length === 0) return;
  const userId = users[0].id;

  const days = await prisma.tradingDay.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  const depositos = await prisma.depositoSaque.findMany({ where: { userId, conta: 'RESERVA' }, orderBy: { data: 'asc' } });
  const config = await prisma.configuration.findFirst({ where: { userId }});
  const cambio = config?.cambioCompra || 5.0;

  for (const day of days) {
    if (day.bancaGlobal !== 0) continue; // skip correctly updated 

    // Sum historical reserva up to day.date
    let reservaBRL = 0;
    for (const d of depositos) {
      if (d.data <= day.date) {
        reservaBRL += d.tipo === 'DEPOSITO' ? d.valorBRL : -d.valorBRL;
      }
    }
    const reservaUSD = reservaBRL / cambio;
    const historicalBancaGlobal = day.capitalInicialReal + reservaUSD;

    await prisma.tradingDay.update({
      where: { id: day.id },
      data: { bancaGlobal: historicalBancaGlobal }
    });
    console.log(`Updated day ${day.date.toISOString().slice(0,10)} with BancaGlobal: $${historicalBancaGlobal.toFixed(2)}`);
  }
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
