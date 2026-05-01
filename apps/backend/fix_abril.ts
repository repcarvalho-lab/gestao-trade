import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c';

  // 1. Criar o Dia de Operação de 30/04 (fechado) para servir de "Saldo Inicial" para Maio
  // 470.09 global = 270.09 corretora + 200 reserva
  const date30Abr = new Date('2026-04-30T12:00:00Z');

  const existingDay = await prisma.tradingDay.findFirst({
    where: { userId, date: date30Abr }
  });

  if (!existingDay) {
    await prisma.tradingDay.create({
      data: {
        userId,
        date: date30Abr,
        capitalInicial: 270.09,
        capitalInicialReal: 270.09,
        capitalFinal: 270.09,
        resultadoDia: 0,
        rentabilidade: 0,
        status: 'OPERANDO',
        isClosed: true,
        bancaGlobal: 470.09,
      }
    });
    console.log('✅ Dia 30/04 recriado como Saldo Inicial.');
  }

  // 2. Criar o Relatório Mensal de Abril para que o mês apareça nos gráficos
  const existingMonth = await prisma.monthlyReport.findUnique({
    where: { userId_mes: { userId, mes: '2026-04' } }
  });

  if (!existingMonth) {
    await prisma.monthlyReport.create({
      data: {
        userId,
        mes: '2026-04',
        dataBase: date30Abr,
        capitalInicial: 270.09,
        capitalFinal: 270.09,
        vlDepositadoSacado: 50, // O depósito feito na corretora
      }
    });
    console.log('✅ Relatório de Abril recriado para exibir no gráfico.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
