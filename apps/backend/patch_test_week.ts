import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  if (users.length === 0) return;
  const userId = users[0].id;

  const data = new Date("2026-05-12T00:00:00Z");

  const inicioSemana = new Date(data);
  const diaSemana = data.getUTCDay(); // dom=0
  inicioSemana.setUTCDate(data.getUTCDate() - diaSemana);
  inicioSemana.setUTCHours(0, 0, 0, 0);

  const fimSemana = new Date(inicioSemana);
  fimSemana.setUTCDate(inicioSemana.getUTCDate() + 6);
  fimSemana.setUTCHours(23, 59, 59, 999);

  const movimentos = await prisma.depositoSaque.findMany({
    where: { userId, data: { gte: inicioSemana, lte: fimSemana } },
  });

  const vlDepositadoSacado = movimentos.reduce((a, m) => {
    return a + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD);
  }, 0);

  // getCapitalStatusAtDate simplified:
  const config = await prisma.configuration.findUnique({ where: { userId } });
  const baseCorretora = config?.saldoInicialCorretora ?? 0;

  const movsCorretora = await prisma.depositoSaque.findMany({
    where: { userId, conta: 'CORRETORA', data: { lte: fimSemana } }
  });
  const netCorretora = movsCorretora.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0
  );

  const diasFechados = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true, date: { lte: fimSemana } },
    select: { resultadoDia: true }
  });
  const lucroFechados = diasFechados.reduce((sum, d) => sum + (d.resultadoDia ?? 0), 0);

  const capitalCorretoraUSD = baseCorretora + netCorretora + lucroFechados;

  console.log("=== RESULTS FOR WEEK 20 ===");
  console.log("inicioSemana:", inicioSemana.toISOString());
  console.log("fimSemana:", fimSemana.toISOString());
  console.log("movimentos found (week):", movimentos.length);
  console.log("vlDepositadoSacado:", vlDepositadoSacado);
  console.log("capitalCorretoraUSD (fimSemana):", capitalCorretoraUSD);
}

run().catch(console.error).finally(() => prisma.$disconnect());
