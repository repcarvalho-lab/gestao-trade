import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando limpeza das operações diárias...');

  // Deleta TradingDays (isso vai apagar em cascata os Trades e Ciclos)
  const deletedDays = await prisma.tradingDay.deleteMany({});
  console.log(`✅ ${deletedDays.count} Dias de Operação apagados (incluindo Ciclos e Trades vinculados).`);

  // Deleta relatórios semanais e mensais para zerar o histórico
  const deletedWeekly = await prisma.weeklyReport.deleteMany({});
  console.log(`✅ ${deletedWeekly.count} Relatórios Semanais apagados.`);

  const deletedMonthly = await prisma.monthlyReport.deleteMany({});
  console.log(`✅ ${deletedMonthly.count} Relatórios Mensais apagados.`);

  console.log('\n🎉 Limpeza concluída! As configurações, ativos, motivos, depósitos e planos foram preservados.');
}

main()
  .catch((e) => {
    console.error('❌ Erro na execução:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
