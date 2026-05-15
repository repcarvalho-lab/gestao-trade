import { prisma } from './apps/backend/src/lib/prisma';
import { getDashboard } from './apps/backend/src/services/dashboard.service';

async function main() {
  const users = await prisma.user.findMany();
  const userId = users[0].id;
  
  const dashboard = await getDashboard(userId);
  console.log("Lucro Total:", dashboard.indicadores.lucroTotal);
  console.log("Crescimento Histórico (%):", dashboard.indicadores.crescimentoPct * 100);
  console.log("Desempenho Mês Atual (%):", dashboard.desempenhoMesAtual?.rentabilidade * 100);
  
  const dias = await prisma.tradingDay.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  console.log("\nTrading Days:");
  dias.forEach(d => console.log(d.date.toISOString(), "CapIni:", d.capitalInicial, "CapIniReal:", d.capitalInicialReal, "Res:", d.resultadoDia));

  const movs = await prisma.depositoSaque.findMany({ where: { userId } });
  console.log("\nMovimentos:");
  movs.forEach(m => console.log(m.data.toISOString(), m.tipo, m.conta, "USD:", m.valorUSD, "BRL:", m.valorBRL));
  
  const config = await prisma.configuration.findUnique({ where: { userId } });
  console.log("\nConfig:", config);
}

main().catch(console.error);
