import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reset() {
  console.log('Limpando trades...')
  await prisma.trade.deleteMany()
  
  console.log('Limpando ciclos...')
  await prisma.ciclo.deleteMany()
  
  console.log('Limpando dias de trading...')
  await prisma.tradingDay.deleteMany()
  
  console.log('Limpando depósitos e saques...')
  await prisma.depositoSaque.deleteMany()
  
  console.log('Limpando relatórios semanais e mensais...')
  await prisma.weeklyReport.deleteMany()
  await prisma.monthlyReport.deleteMany()
  
  console.log('Limpando aportes do planner? (Deixando intactos para não perder setup)')

  // Opcional: Se a intenção era resetar os Motivos e Ativos também, descomentar as linhas abaixo:
  // await prisma.ativo.deleteMany()
  // await prisma.motivoEntrada.deleteMany()
  // await prisma.aportePlanejado.deleteMany()

  console.log('✅ Banco de dados limpo com sucesso! Usuário e Configurações preservados.')
}

reset().finally(() => prisma.$disconnect())
