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
  const totalWins   = dias.reduce((acc, d) => acc + (d.win ?? 0), 0)
  const totalTrades = dias.reduce((acc, d) => acc + (d.numeroTrades ?? 0), 0)
  // Taxa global = total de operações ganhas ÷ total de operações (não média das taxas diárias)
  const taxaAcertoGeral = totalTrades > 0 ? totalWins / totalTrades : 0
  const maiorGain = Math.max(...dias.map((d) => d.resultadoDia ?? 0), 0)
  const maiorLoss = dias.length > 0 ? Math.min(...dias.map((d) => d.resultadoDia ?? 0)) : 0
  const totalGanhos = dias.filter(d => (d.resultadoDia ?? 0) > 0).reduce((acc, d) => acc + (d.resultadoDia ?? 0), 0)
  const totalPerdas = dias.filter(d => (d.resultadoDia ?? 0) < 0).reduce((acc, d) => acc + (d.resultadoDia ?? 0), 0)
  const pctDiasPositivos = diaTotais > 0 ? diasPositivos / diaTotais : 0

  let maiorSequenciaPositiva = 0
  let maiorSequenciaNegativa = 0
  let sequenciaAtual = 0
  for (const d of dias) {
    if ((d.resultadoDia ?? 0) > 0) {
      sequenciaAtual++
      if (sequenciaAtual > maiorSequenciaPositiva) maiorSequenciaPositiva = sequenciaAtual
    } else {
      sequenciaAtual = 0
    }
  }
  sequenciaAtual = 0
  for (const d of dias) {
    if ((d.resultadoDia ?? 0) < 0) {
      sequenciaAtual++
      if (sequenciaAtual > maiorSequenciaNegativa) maiorSequenciaNegativa = sequenciaAtual
    } else {
      sequenciaAtual = 0
    }
  }

  const capitalInicialHistorico = dias[0]?.capitalInicial ?? 0
  const crescimentoPct = capitalInicialHistorico > 0 ? lucroTotal / capitalInicialHistorico : 0
  const mediaLucroDia = diaTotais > 0 ? lucroTotal / diaTotais : 0
  const mediaRentabilidade = diaTotais > 0
    ? dias.reduce((acc, d) => acc + (d.rentabilidade ?? 0), 0) / diaTotais
    : 0

  const movimentos = await prisma.depositoSaque.findMany({ where: { userId } })
  const totalAportes = movimentos.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorUSD, 0)
  const totalSaques  = movimentos.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorUSD, 0)

  const config = await prisma.configuration.findUnique({ where: { userId } })

  // ── Desempenho do mês atual ──
  const agora = new Date()
  const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)

  const diasMesAtual = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true, date: { gte: inicioMesAtual } },
    orderBy: { date: 'asc' },
  })

  type NivelDesempenho = 'SEM_DADOS' | 'ABAIXO_META' | 'CONSERVADOR' | 'REALISTA' | 'AGRESSIVO'

  let desempenhoMesAtual: {
    nivel: NivelDesempenho
    rentabilidade: number
    capitalInicio: number
    capitalAtual: number
    diasOperados: number
    diasPositivos: number
    maiorSequenciaPositiva: number
    maiorSequenciaNegativa: number
  }

  if (diasMesAtual.length === 0) {
    desempenhoMesAtual = {
      nivel: 'SEM_DADOS',
      rentabilidade: 0,
      capitalInicio: 0,
      capitalAtual: 0,
      diasOperados: 0,
      diasPositivos: 0,
      maiorSequenciaPositiva: 0,
      maiorSequenciaNegativa: 0,
    }
  } else {
    const capitalInicio = diasMesAtual[0].capitalInicialReal
    const capitalFimAtual = diasMesAtual[diasMesAtual.length - 1].capitalFinal ?? capitalInicio
    const lucroMes = diasMesAtual.reduce((acc, d) => acc + (d.resultadoDia ?? 0), 0)
    const rentabilidade = capitalInicio > 0 ? lucroMes / capitalInicio : 0

    const retCons = config?.retornoConservador ?? 0.20
    const retReal = config?.retornoRealista ?? 0.40
    const retAgr  = config?.retornoAgressivo  ?? 0.60

    let nivel: NivelDesempenho
    if (rentabilidade >= retAgr)       nivel = 'AGRESSIVO'
    else if (rentabilidade >= retReal) nivel = 'REALISTA'
    else if (rentabilidade >= retCons) nivel = 'CONSERVADOR'
    else                               nivel = 'ABAIXO_META'

    const diasPositivosMes = diasMesAtual.filter(d => (d.resultadoDia ?? 0) > 0).length

    let maiorSeqPos = 0, maiorSeqNeg = 0, seqAtualPos = 0, seqAtualNeg = 0
    for (const d of diasMesAtual) {
      if ((d.resultadoDia ?? 0) > 0) { seqAtualPos++; seqAtualNeg = 0; maiorSeqPos = Math.max(maiorSeqPos, seqAtualPos) }
      else                            { seqAtualNeg++; seqAtualPos = 0; maiorSeqNeg = Math.max(maiorSeqNeg, seqAtualNeg) }
    }

    desempenhoMesAtual = {
      nivel,
      rentabilidade,
      capitalInicio,
      capitalAtual: capitalFimAtual,
      diasOperados: diasMesAtual.length,
      diasPositivos: diasPositivosMes,
      maiorSequenciaPositiva: maiorSeqPos,
      maiorSequenciaNegativa: maiorSeqNeg,
    }
  }

  // Dados para gráfico de evolução de capital
  // O primeiro ponto mostra o capital INICIAL (dia anterior ao primeiro pregão),
  // os demais mostram o capitalFinal de cada dia fechado.
  const evolucaoCapital: { data: Date; capital: number; resultado: number; rentabilidade: number; totalTrades: number; taxaAcerto: number }[] = []
  if (dias.length > 0) {
    const dataAntes = new Date(dias[0].date)
    dataAntes.setUTCDate(dataAntes.getUTCDate() - 1)
    evolucaoCapital.push({ data: dataAntes, capital: dias[0].capitalInicialReal, resultado: 0, rentabilidade: 0, totalTrades: 0, taxaAcerto: 0 })
  }
  for (const d of dias) {
    evolucaoCapital.push({
      data: d.date,
      capital: d.capitalFinal ?? 0,
      resultado: d.resultadoDia ?? 0,
      rentabilidade: d.rentabilidade ?? 0,
      totalTrades: (d.win ?? 0) + (d.loss ?? 0),
      taxaAcerto: d.taxaAcerto ?? 0,
    })
  }



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

  // Verifica se há um dia em andamento (aberto, não fechado)
  const diaAberto = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
    orderBy: { date: 'desc' },
    select: { date: true, capitalInicialReal: true },
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
      totalGanhos,
      totalPerdas,
      pctDiasPositivos,
      maiorSequenciaPositiva,
      maiorSequenciaNegativa,
      crescimentoPct,
      mediaLucroDia,
      mediaRentabilidade,
      totalAportes,
      totalSaques,
    },
    desempenhoMesAtual,
    diaEmAndamento: diaAberto
      ? { data: diaAberto.date, capitalInicial: diaAberto.capitalInicialReal }
      : null,
    financeiro: {
      aporteValor: config?.aporteValor ?? 0,
      aporteMes: config?.aporteMes ?? null,
      saque: config?.saque ?? 0,
      saquesMesInicio: config?.saquesMesInicio ?? null,
    },
    evolucaoCapital,
    semanas: semanas.reverse(),
    meses: meses.reverse(),
  }
}
