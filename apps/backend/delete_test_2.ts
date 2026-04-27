import { excluirTrade } from './src/services/trades.service';
import { PrismaClient } from '@prisma/client';

async function test() {
  const p = new PrismaClient();
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c';
  
  try {
    const trade = await p.trade.findFirst({
        where: { userId },
        include: { ciclo: true }
    });
    
    if (!trade) {
        console.log('Nenhum trade encontrado para o teste.');
        return;
    }
    
    console.log('Tentando excluir trade:', trade.id);
    await excluirTrade(trade.id, userId);
    console.log('Sucesso!');
  } catch (err) {
    console.error('Erro ao excluir:', err);
  } finally {
    await p.$disconnect();
  }
}

test();
