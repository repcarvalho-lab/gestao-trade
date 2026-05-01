import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando exclusão do motivo "Live"...');

  const result = await prisma.motivoEntrada.deleteMany({
    where: { nome: 'Live' },
  });

  console.log(`✅ ${result.count} motivo(s) "Live" excluído(s) com sucesso.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na execução:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
