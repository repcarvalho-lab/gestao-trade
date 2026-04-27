import { excluirTrade } from './src/services/trades.service';
import { PrismaClient } from '@prisma/client';

async function test() {
  const p = new PrismaClient();
  const tradeId = '26022b9e-d205-43db-ba96-45e245e4c861';
  const userId = '7288004b-2de3-4670-9ec7-bc4d921d694c';
  
  try {
    console.log('Tentando excluir trade...');
    await excluirTrade(tradeId, userId);
    console.log('Sucesso!');
  } catch (err) {
    console.error('Erro ao excluir:', err);
  } finally {
    await p.$disconnect();
  }
}

test();
