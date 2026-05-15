const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (!users.length) return;
  const config = await prisma.configuration.findUnique({ where: { userId: users[0].id } });
  console.log("Config dataSaldoInicial:", config.dataSaldoInicial);
}
main().finally(() => prisma.$disconnect());
