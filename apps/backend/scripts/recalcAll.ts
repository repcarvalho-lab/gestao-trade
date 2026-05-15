import { PrismaClient } from '@prisma/client'
import { recalcularRelatorios } from '../src/services/relatorios.service'

const prisma = new PrismaClient()

async function run() {
  console.log('Recalculando relatórios...')
  const users = await prisma.user.findMany()
  for (const u of users) {
    const dias = await prisma.tradingDay.findMany({ 
      where: { userId: u.id, isClosed: true },
      orderBy: { date: 'asc' }
    })
    
    // Agrupa por semana para não rodar n vezes na mesma semana
    const semanasFeitas = new Set<string>()
    for (const d of dias) {
      const year = d.date.getUTCFullYear()
      const week = Math.ceil((((d.date.getTime() - new Date(year,0,1).getTime()) / 86400000) + new Date(year,0,1).getDay() + 1) / 7)
      const key = `${year}-${week}`
      
      if (!semanasFeitas.has(key)) {
        await recalcularRelatorios(u.id, d.date)
        semanasFeitas.add(key)
        console.log(`Recalculado user ${u.id} semana ${key}`)
      }
    }
  }
  console.log('Fim!')
  process.exit(0)
}

run().catch(console.error)
