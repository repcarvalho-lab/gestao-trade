import { PrismaClient } from '@prisma/client';
import { getPlanejadoRealizado } from './src/services/planejadoRealizado.service';

const prisma = new PrismaClient();

async function main() {
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c';
  const data = await getPlanejadoRealizado(userId);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
