const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const configs = await prisma.configuration.findMany();
  console.log(configs);
}
main();
