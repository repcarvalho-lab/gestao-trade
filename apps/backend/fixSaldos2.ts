import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const userId = user.id;
    const config = await prisma.configuration.findUnique({ where: { userId } });
    if (!config) continue;
    
    const days = await prisma.tradingDay.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const dayStart = new Date(day.date);
      const dayEnd = new Date(day.date);
      dayEnd.setHours(23, 59, 59, 999);

      const movsHojeReserva = await prisma.depositoSaque.findMany({
        where: { userId, conta: 'RESERVA', data: { gte: dayStart, lte: dayEnd } }
      });
      const netHojeReservaBRL = movsHojeReserva.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL), 0);
      const depositoReserva = netHojeReservaBRL / (config.cambioCompra || 5.0);

      await prisma.tradingDay.update({
        where: { id: day.id },
        data: { depositoReserva }
      });

      console.log(`Atualizou dia ${day.date.toISOString().slice(0,10)}: depositoReserva=${depositoReserva.toFixed(2)}`);
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
