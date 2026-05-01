import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const motivosLive = await prisma.motivoEntrada.findMany({
    where: { nome: 'Live' },
    include: { _count: { select: { trades: true } } }
  });

  for (const motivo of motivosLive) {
    console.log(`Motivo: ${motivo.nome}, Usuário: ${motivo.userId}, Trades: ${motivo._count.trades}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
