import { prisma } from '../lib/prisma'

export async function getDashboard(userId: string) {
  const dias = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true },
    orderBy: { date: 'asc' },
  })

  const diaTotais = dias.length
  const diasPositivos = dias.filter((d) => (d.resultadoDia ?? 0) > 0).length
  const lucroTotal = dias.reduce((acc, d) => acc + (d.resultadoDia ?? 0), 0)
  const ultimoCapital = dias[dias.length - 1]?.capitalFinal ?? 0
  const taxaAcertoGeral =
    dias.reduce((acc, d) => acc + (d.taxaAcerto ?? 0), 0) / (diaTotais || 1)
  const maiorGain = Math.max(...dias.map((d) => d.resultadoDia ?? 0), 0)
  const maiorLoss = Math.min(...dias.map((d) => d.resultadoDia ?? 0), 0)

  const config = await prisma.configuration.findUnique({ where: { userId } })

  // Dados para gráfico de evolução de capital
  const evolucaoCapital = dias.map((d) => ({
    data: d.date,
    capital: d.capitalFinal ?? 0,
    resultado: d.resultadoDia ?? 0,
  }))

  // Taxa de acerto semanal
  const semanas = await prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: [{ ano: 'desc' }, { semana: 'desc' }],
    take: 8,
  })

  const meses = await prisma.monthlyReport.findMany({
    where: { userId },
    orderBy: { mes: 'desc' },
    take: 6,
  })

  return {
    indicadores: {
      diasOperados: diaTotais,
      diasPositivos,
      lucroTotal,
      ultimoCapital,
      taxaAcertoGeral,
      maiorGain,
      maiorLoss,
    },
    financeiro: {
      aporteValor: config?.aporteValor ?? 0,
      aporteMes: config?.aporteMes ?? null,
      saqueMinimo: config?.saqueMinimo ?? 0,
      saqueMaximo: config?.saqueMaximo ?? 0,
      saquesMesInicio: config?.saquesMesInicio ?? null,
    },
    evolucaoCapital,
    semanas: semanas.reverse(),
    meses: meses.reverse(),
  }
}
