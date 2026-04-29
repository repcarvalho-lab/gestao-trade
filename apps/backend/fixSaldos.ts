import { PrismaClient } from '@prisma/client';
import { recalcularDia } from './src/services/dayCalculator';

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const userId = user.id;
    const config = await prisma.configuration.findUnique({ where: { userId } });
    if (!config) continue;
    
    // Pegar dias na ordem CORRETA do mais antigo para o mais novo
    const days = await prisma.tradingDay.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      include: { trades: true }
    });

    let lastCapitalFinal = 0;
    
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const prevDay = i > 0 ? days[i-1] : null;

      // 1. movsAnteriores
      const gtDate = prevDay ? prevDay.date : undefined;
      const movsAnteriores = await prisma.depositoSaque.findMany({
        where: { userId, conta: 'CORRETORA', data: { ...(gtDate ? { gt: gtDate } : {}), lt: day.date } }
      });
      const netAnteriores = movsAnteriores.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0);

      // Usar a variavel rastreada
      let capitalInicial = 0;
      if (i === 0) {
        capitalInicial = day.capitalInicial; // Ponto de partida original
      } else {
        capitalInicial = lastCapitalFinal + netAnteriores;
      }

      // 2. movsHoje (lte dayEnd)
      const dayEnd = new Date(day.date);
      dayEnd.setHours(23, 59, 59, 999);
      const movsHoje = await prisma.depositoSaque.findMany({
        where: { userId, conta: 'CORRETORA', data: { gte: day.date, lte: dayEnd } }
      });
      const netHoje = movsHoje.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0);
      
      const capitalInicialReal = capitalInicial + netHoje;

      // 3. Reserva ate dayEnd
      const movsReserva = await prisma.depositoSaque.findMany({
        where: { userId, conta: 'RESERVA', data: { lte: dayEnd } }
      });
      const reservaBRL = movsReserva.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL), 0);
      const reservaUSD = reservaBRL / (config.cambioCompra || 5.0);
      
      const bancaGlobal = capitalInicialReal + reservaUSD;

      // Recalcular trades
      const calc = recalcularDia({ ...day, capitalInicialReal, deposito: netHoje }, day.trades as any, config, bancaGlobal);

      const statusFinal = (day.isClosed && (calc.status === 'ATENCAO' || calc.status === 'OPERANDO')) 
         ? 'META_NAO_ATINGIDA' : calc.status;

      const capitalFinal = capitalInicialReal + calc.resultadoDia;
      lastCapitalFinal = capitalFinal;

      await prisma.tradingDay.update({
        where: { id: day.id },
        data: {
          capitalInicial,
          capitalInicialReal,
          bancaGlobal,
          deposito: netHoje,
          resultadoDia: calc.resultadoDia,
          capitalFinal: day.isClosed ? capitalFinal : null,
          status: statusFinal
        }
      });

      console.log(`Atualizou dia ${day.date.toISOString().slice(0,10)}: Inicio=${capitalInicial.toFixed(2)}, CapInitReal=${capitalInicialReal.toFixed(2)}, Global=${bancaGlobal.toFixed(2)}`);
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
