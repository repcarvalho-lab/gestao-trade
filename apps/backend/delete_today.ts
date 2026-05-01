import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 're.pcarvalho@gmail.com' } });
  if (!user) {
    console.log("Usuário não encontrado.");
    return;
  }
  
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  
  const dia = await prisma.tradingDay.findFirst({
    where: { userId: user.id, date: hoje }
  });
  
  if (!dia) {
    console.log("Nenhum dia de hoje encontrado.");
    return;
  }
  
  await prisma.trade.deleteMany({ where: { tradingDayId: dia.id } });
  await prisma.ciclo.deleteMany({ where: { tradingDayId: dia.id } });
  await prisma.tradingDay.delete({ where: { id: dia.id } });
  
  console.log("Dia de hoje deletado com sucesso!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
