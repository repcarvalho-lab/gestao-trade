import { prisma } from '../lib/prisma'

function getWeekNumber(date: Date): { semana: number; ano: number } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  const semana = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return { semana, ano: d.getFullYear() }
}

function getMes(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function recalcularRelatorios(userId: string, data: Date) {
  await recalcularRelatorioSemanal(userId, data)
  await recalcularRelatorioMensal(userId, data)
}

async function recalcularRelatorioSemanal(userId: string, data: Date) {
  const { semana, ano } = getWeekNumber(data)

  // Busca todos os dias fechados dessa semana ISO
  const inicioSemana = new Date(data)
  const diaSemana = (data.getDay() + 6) % 7 // seg=0
  inicioSemana.setDate(data.getDate() - diaSemana)
  inicioSemana.setHours(0, 0, 0, 0)

  const fimSemana = new Date(inicioSemana)
  fimSemana.setDate(inicioSemana.getDate() + 6)
  fimSemana.setHours(23, 59, 59, 999)

  const dias = await prisma.tradingDay.findMany({
    where: {
      userId,
      isClosed: true,
      date: { gte: inicioSemana, lte: fimSemana },
    },
  })

  if (dias.length === 0) {
    await prisma.weeklyReport.deleteMany({
      where: { userId, semana, ano },
    })
    return
  }

  const diasPositivos = dias.filter((d) => (d.resultadoDia ?? 0) > 0).length
  const diasNegativos = dias.filter((d) => (d.resultadoDia ?? 0) < 0).length
  const totalWin = dias.reduce((a, d) => a + d.win, 0)
  const totalLoss = dias.reduce((a, d) => a + d.loss, 0)
  const totalTrades = totalWin + totalLoss
  const taxaAcerto = totalTrades > 0 ? totalWin / totalTrades : 0
  const lucroTotal = dias.reduce((a, d) => a + (d.resultadoDia ?? 0), 0)
  const capitalInicial = dias[0]?.capitalInicial ?? 0
  const capitalFinal = dias[dias.length - 1]?.capitalFinal ?? 0
  const rentabTotal = capitalInicial > 0 ? lucroTotal / capitalInicial : 0
  const resultados = dias.map((d) => d.resultadoDia ?? 0)
  const melhorDia = Math.max(...resultados)
  const piorDia = Math.min(...resultados)

  await prisma.weeklyReport.upsert({
    where: { userId_semana_ano: { userId, semana, ano } },
    update: {
      diasOperados: dias.length,
      diasPositivos,
      diasNegativos,
      totalWin,
      totalLoss,
      taxaAcerto,
      lucroTotal,
      capitalInicial,
      capitalFinal,
      rentabTotal,
      melhorDia,
      piorDia,
      dataFinal: fimSemana,
    },
    create: {
      userId,
      semana,
      ano,
      dataInicial: inicioSemana,
      dataFinal: fimSemana,
      diasOperados: dias.length,
      diasPositivos,
      diasNegativos,
      totalWin,
      totalLoss,
      taxaAcerto,
      lucroTotal,
      capitalInicial,
      capitalFinal,
      rentabTotal,
      melhorDia,
      piorDia,
    },
  })
}

async function recalcularRelatorioMensal(userId: string, data: Date) {
  const mes = getMes(data)

  const inicioMes = new Date(data.getFullYear(), data.getMonth(), 1)
  const fimMes = new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59)

  const dias = await prisma.tradingDay.findMany({
    where: {
      userId,
      isClosed: true,
      date: { gte: inicioMes, lte: fimMes },
    },
    orderBy: { date: 'asc' },
  })

  if (dias.length === 0) {
    await prisma.monthlyReport.deleteMany({
      where: { userId, mes },
    })
    return
  }

  const movimentos = await prisma.depositoSaque.findMany({
    where: { userId, mes },
  })

  const diasPositivos = dias.filter((d) => (d.resultadoDia ?? 0) > 0).length
  const diasNegativos = dias.filter((d) => (d.resultadoDia ?? 0) < 0).length
  const capitalInicial = dias[0].capitalInicial
  const capitalFinal = dias[dias.length - 1].capitalFinal ?? 0
  const lucroTotal = dias.reduce((a, d) => a + (d.resultadoDia ?? 0), 0)
  const vlDepositadoSacado = movimentos.reduce((a, m) => {
    return a + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD)
  }, 0)
  const rentabTotal = capitalInicial > 0 ? lucroTotal / capitalInicial : 0
  const rentabMedia = dias.reduce((a, d) => a + (d.rentabilidade ?? 0), 0) / dias.length
  const totalWin = dias.reduce((a, d) => a + d.win, 0)
  const totalLoss = dias.reduce((a, d) => a + d.loss, 0)
  const totalTrades = totalWin + totalLoss
  const taxaAcertoMedia = totalTrades > 0 ? totalWin / totalTrades : 0
  const resultados = dias.map((d) => d.resultadoDia ?? 0)
  const maiorGain = Math.max(...resultados)
  const maiorLoss = Math.min(...resultados)

  await prisma.monthlyReport.upsert({
    where: { userId_mes: { userId, mes } },
    update: {
      diasOperados: dias.length,
      diasPositivos,
      diasNegativos,
      capitalInicial,
      capitalFinal,
      lucroTotal,
      vlDepositadoSacado,
      rentabTotal,
      rentabMedia,
      taxaAcertoMedia,
      maiorGain,
      maiorLoss,
    },
    create: {
      userId,
      mes,
      dataBase: inicioMes,
      diasOperados: dias.length,
      diasPositivos,
      diasNegativos,
      capitalInicial,
      capitalFinal,
      lucroTotal,
      vlDepositadoSacado,
      rentabTotal,
      rentabMedia,
      taxaAcertoMedia,
      maiorGain,
      maiorLoss,
    },
  })
}

export async function getRelatoriosSemanal(userId: string) {
  return prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: [{ ano: 'desc' }, { semana: 'desc' }],
  })
}

export async function getRelatoriosMensal(userId: string) {
  return prisma.monthlyReport.findMany({
    where: { userId },
    orderBy: { mes: 'desc' },
  })
}
