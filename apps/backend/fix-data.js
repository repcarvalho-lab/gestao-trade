require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (!users.length) return;
  const data = new Date('2026-04-01T12:00:00Z');
  await prisma.configuration.update({
    where: { userId: users[0].id },
    data: { dataSaldoInicial: data }
  });
  console.log("Updated dataSaldoInicial to", data);
}
main().finally(() => prisma.$disconnect());
