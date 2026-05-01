const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDashboard } = require('./src/services/dashboard.service');

async function main() {
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c';
  const dashboard = await getDashboard(userId);
  console.log("Evolucao:");
  for (const item of dashboard.evolucaoCapital.slice(-5)) {
    console.log(`${item.data.toISOString().split('T')[0]} | capital: ${item.capital}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
