import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const motivoIA = await prisma.motivoEntrada.findFirst({
    where: { nome: 'IA' },
  });

  const motivoIABinaryClass = await prisma.motivoEntrada.findFirst({
    where: { nome: 'IA - Binary Class' },
  });

  if (!motivoIA) {
    console.log('Motivo "IA" não encontrado.');
    return;
  }

  if (!motivoIABinaryClass) {
    console.log('Motivo "IA - Binary Class" não encontrado.');
    return;
  }

  console.log(`Atualizando trades de "${motivoIA.nome}" para "${motivoIABinaryClass.nome}"...`);

  const updated = await prisma.trade.updateMany({
    where: { motivoId: motivoIA.id },
    data: { motivoId: motivoIABinaryClass.id },
  });

  console.log(`Foram atualizados ${updated.count} trades.`);

  console.log('Deletando motivo "IA"...');
  await prisma.motivoEntrada.delete({
    where: { id: motivoIA.id },
  });

  console.log('Processo concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
