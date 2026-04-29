const { PrismaClient } = require('./apps/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  const userId = users[0].id;
  const deps = await prisma.depositoSaque.findMany({ where: { userId } });
  console.log("Depositos Count:", deps.length);
  if (deps.length > 0) {
    console.log("Exemplo:", deps[deps.length - 1]);
  }
}
run();
