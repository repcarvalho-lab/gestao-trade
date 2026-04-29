import { PrismaClient } from './node_modules/@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany();
  if (!users.length) return;
  const meses = await prisma.monthlyReport.findMany({ where: { userId: users[0].id } });
  console.log(meses);
}
run();
