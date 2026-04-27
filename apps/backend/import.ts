import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { recalcularDia } from './src/services/dayCalculator'

const prisma = new PrismaClient()

function parseMoney(valStr: string) {
  if (!valStr) return 0
  const clean = valStr.replace(/[^0-9.-]/g, '')
  return parseFloat(clean) || 0
}

async function run() {
  const filePath = path.join(__dirname, '../../operacoes_2026-04-10_09-29-19.csv')
  const content = fs.readFileSync(filePath, 'utf8')
  
  const lines = content.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',')
  
  // Extrair usuário e config
  const user = await prisma.user.findFirst({ where: { email: 're.pcarvalho@gmail.com' } })
  if (!user) throw new Error('Usuario base nao encontrado')
  
  const config = await prisma.configuration.findUnique({ where: { userId: user.id } })
  if (!config) throw new Error('Configuracao base nao encontrada')

  // Parse lines: ID,Data,Ativo,Tempo,Previsão,Vela,P. ABRT,P. FECH,Valor,Estornado,Executado,Status,Resultado
  const trades = lines.slice(1).map(l => {
    const rawCells = l.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
    if (!rawCells) return null
    const cells = rawCells.map(c => c.replace(/^"|"$/g, '').trim())
    
    // Ignorar linhas inválidas
    if (cells.length < 13) return null

    const dataOriginal = cells[1] // "10/04/2026 08:28:34"
    if (!dataOriginal) return null
    if (!dataOriginal.includes('/04/2026')) return null // Ignorar Março

    const parts = dataOriginal.split(' ')[0].split('/')
    // Format to Date UTC midnight for the group
    const diaIso = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`
    const hora = dataOriginal.split(' ')[1]
    const datetimeIso = `${parts[2]}-${parts[1]}-${parts[0]}T${hora}.000Z`

    return {
      ativo: cells[2],
      diaIso,
      hora: datetimeIso,
      valor: parseMoney(cells[8]),
      status: cells[11].toUpperCase() === 'WIN' ? 'WIN' : 'LOSS',
      resultado: parseMoney(cells[12])
    }
  }).filter(t => t !== null) as any[]

  // Group by day
  const grouped: Record<string, any[]> = {}
  for (const t of trades) {
    if (!grouped[t.diaIso]) grouped[t.diaIso] = []
    grouped[t.diaIso].push(t)
  }

  // Sort dates (earliest first)
  const datas = Object.keys(grouped).sort()
  
  let capitalAcumulado = 1000 // Iniciar com capital hipotetico ou 1000
  
  for (const dataIso of datas) {
    const list = grouped[dataIso].sort((a,b) => a.hora.localeCompare(b.hora)) // cronologico
    console.log(`Processando dia ${dataIso} com ${list.length} trades`)
    
    // Inserir TradingDay
    let day = await prisma.tradingDay.findFirst({ where: { userId: user.id, date: new Date(dataIso) } })
    if (!day) {
      day = await prisma.tradingDay.create({
        data: {
          userId: user.id,
          date: new Date(dataIso),
          capitalInicial: capitalAcumulado,
          capitalInicialReal: capitalAcumulado,
        }
      })
    } else {
      capitalAcumulado = day.capitalInicialReal
    }

    let currentCicloId = null
    let numCiclo = 1
    let seqLosses = 0

    // Criar trades
    for (const t of list) {
      // Determinar o ciclo e o tipo
      if (!currentCicloId || seqLosses === 0) {
        // Novo ciclo
        const ciclo = await prisma.ciclo.create({
          data: {
            tradingDayId: day.id,
            userId: user.id,
            numero: numCiclo++,
          }
        })
        currentCicloId = ciclo.id
      }

      let tipo: any = 'ENTR'
      if (seqLosses === 1) tipo = 'MG1'
      if (seqLosses >= 2) tipo = 'MG2'

      await prisma.trade.create({
        data: {
          tradingDayId: day.id,
          cicloId: currentCicloId,
          userId: user.id,
          tipo: tipo as any,
          valor: t.valor,
          status: t.status,
          ativo: t.ativo,
          resultado: t.resultado,
          horario: new Date(t.hora)
        }
      })

      // Atualizar ciclo status
      if (t.status === 'WIN') {
        await prisma.ciclo.update({
          where: { id: currentCicloId },
          data: { status: 'FECHADO_WIN', resultado: t.resultado } // simplificado
        })
        seqLosses = 0 // reseta pro proximo ciclo
      } else {
        seqLosses++
        if (seqLosses > 2) {
           await prisma.ciclo.update({
            where: { id: currentCicloId },
            data: { status: 'FECHADO_STOP', resultado: -99 }
          })
          seqLosses = 0 // reseta pro proximo ciclo
        }
      }
    }

    // Recalcular dia
    const todosTrades = await prisma.trade.findMany({ where: { tradingDayId: day.id } })
    const ciclos = await prisma.ciclo.findMany({ where: { tradingDayId: day.id } })
    // Calcula totais em ciclos
    for (const c of ciclos) {
       const ct = todosTrades.filter(x => x.cicloId === c.id)
       const inv = ct.reduce((s,x)=> s+x.valor, 0)
       const res = ct.reduce((s,x)=> s+(x.resultado || 0), 0)
       await prisma.ciclo.update({ where: { id: c.id }, data: { totalInvestido: inv, resultado: res }})
    }

    const calc = recalcularDia(day, todosTrades, config)
    capitalAcumulado += (calc.resultadoDia || 0)

    await prisma.tradingDay.update({
      where: { id: day.id },
      data: {
        resultadoDia: calc.resultadoDia,
        rentabilidade: calc.rentabilidade,
        status: calc.status,
        win: calc.win,
        loss: calc.loss,
        numeroTrades: calc.numeroTrades,
        taxaAcerto: calc.taxaAcerto,
        ciclosRealizados: calc.ciclosRealizados,
        capitalFinal: capitalAcumulado,
        isClosed: true
      }
    })
  }

  console.log('✅ Importação de Abril concluída com sucesso e dias fechados!')
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect())
