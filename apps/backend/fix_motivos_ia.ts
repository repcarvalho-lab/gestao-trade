import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando correção de motivos de entrada...');

  // Busca todos os motivos com o nome "IA"
  const motivosIA = await prisma.motivoEntrada.findMany({
    where: { nome: 'IA' },
  });

  if (motivosIA.length === 0) {
    console.log('✅ Nenhum motivo "IA" encontrado. O banco de dados já está correto.');
    return;
  }

  for (const motivoIA of motivosIA) {
    // Verifica se já existe um "IA - Binary Class" para o mesmo usuário
    const motivoBinaryClass = await prisma.motivoEntrada.findFirst({
      where: { userId: motivoIA.userId, nome: 'IA - Binary Class' },
    });

    if (motivoBinaryClass) {
      console.log(`\n📌 Encontrado "IA" e "IA - Binary Class" para o usuário ${motivoIA.userId}.`);
      
      // Atualiza os trades que usavam "IA" para usar "IA - Binary Class"
      const tradesAtualizados = await prisma.trade.updateMany({
        where: { motivoId: motivoIA.id, userId: motivoIA.userId },
        data: { motivoId: motivoBinaryClass.id },
      });
      
      console.log(`   ✅ ${tradesAtualizados.count} trades atualizados de "IA" para "IA - Binary Class".`);

      // Deleta o motivo "IA" antigo
      await prisma.motivoEntrada.delete({
        where: { id: motivoIA.id },
      });
      console.log(`   🗑️ Motivo "IA" excluído.`);
      
    } else {
      console.log(`\n📌 O usuário ${motivoIA.userId} possui apenas "IA", renomeando para "IA - Binary Class"...`);
      
      // Se não tem "IA - Binary Class", apenas renomeia o "IA" existente
      await prisma.motivoEntrada.update({
        where: { id: motivoIA.id },
        data: { nome: 'IA - Binary Class' },
      });
      
      console.log(`   ✅ Motivo renomeado com sucesso.`);
    }
  }

  console.log('\n🎉 Processo concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro na execução:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
