import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c'; // email: re.pcarvalho@gmail.com
  
  // Calcula o total depositado em Abril
  const depositosAbril = await prisma.depositoSaque.findMany({
    where: { userId, mes: '2026-04', tipo: 'DEPOSITO' }
  });
  
  const totalDepositado = depositosAbril.reduce((acc, d) => acc + d.valorUSD, 0);

  // Cria ou atualiza o Aporte Planejado de Abril
  await prisma.aportePlanejado.upsert({
    where: { userId_mes: { userId, mes: '2026-04' } },
    update: { valor: totalDepositado },
    create: { userId, mes: '2026-04', valor: totalDepositado, dia: 1 }
  });

  console.log(`✅ Aporte Planejado de Abril criado/atualizado com o valor de US$ ${totalDepositado}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
