import { prisma } from '../lib/prisma'
import { getCapitalStatus } from './capital.service'

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

  let sequenciaAtualGlobal = 0
  if (dias.length > 0) {
    const ultimoResultado = dias[dias.length - 1].resultadoDia ?? 0
    if (ultimoResultado !== 0) {
      const isPositivo = ultimoResultado > 0
      for (let i = dias.length - 1; i >= 0; i--) {
        const res = dias[i].resultadoDia ?? 0
        if (isPositivo && res > 0) sequenciaAtualGlobal++
        else if (!isPositivo && res < 0) sequenciaAtualGlobal--
        else break
      }
    }
  }

  const config = await prisma.configuration.findUnique({ where: { userId } })

  const capStatus = await getCapitalStatus(userId)
  const capitalInvestidoTotal = capStatus.bancaGlobalUSD - lucroTotal
  const crescimentoPct = capitalInvestidoTotal > 0 ? lucroTotal / capitalInvestidoTotal : 0
  
  const mediaLucroDia = diaTotais > 0 ? lucroTotal / diaTotais : 0
  const mediaRentabilidade = diaTotais > 0
    ? dias.reduce((acc, d) => acc + (d.rentabilidade ?? 0), 0) / diaTotais
    : 0



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
    lucroMes: number
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
      lucroMes: 0,
      diasOperados: 0,
      diasPositivos: 0,
      maiorSequenciaPositiva: 0,
      maiorSequenciaNegativa: 0,
    }
  } else {
    // 1. Precisamos da Banca Global exatamente no início do mês
    // Para simplificar, podemos pegar o capitalInicial do 1º dia como saldo da corretora
    const capCorretoraInicioMes = diasMesAtual[0].capitalInicialReal
    
    // Calcular as movimentações da Reserva até ANTES desse mês para achar a Reserva Inicial do Mês
    const movsReservaAntes = await prisma.depositoSaque.findMany({
      where: { userId, conta: 'RESERVA', data: { lt: inicioMesAtual } } 
    })
    const saldoReservaAntesBRL = movsReservaAntes.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL), 0)
    const capReservaInicioMes = saldoReservaAntesBRL / (config?.cambioCompra || 5.0)

    const capitalInicioGlobal = capCorretoraInicioMes + capReservaInicioMes

    // 2. Calcular o Peso Ponderado (Time-Weighted) dos Fluxos de Caixa DENTRO do mês atual
    // Buscamos aportes e saques de todas as contas que aconteceram neste mês
    const movsMesAtual = await prisma.depositoSaque.findMany({
      where: { userId, data: { gte: inicioMesAtual } }
    })
    
    const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
    let pesoNet = 0
    let capitalFimAtual = capitalInicioGlobal

    for (const mov of movsMesAtual) {
      const isDeposit = mov.tipo === 'DEPOSITO'
      const effect = isDeposit ? mov.valorUSD : -mov.valorUSD
      
      const diaMov = mov.data.getUTCDate()
      const diasRestantes = Math.max(0, diasNoMes - diaMov)
      const ratio = diasRestantes / diasNoMes
      
      pesoNet += effect * ratio
      capitalFimAtual += effect // O saldo final óbvio soma o valor absoluto do fluxo
    }

    const lucroMes = diasMesAtual.reduce((acc, d) => acc + (d.resultadoDia ?? 0), 0)
    capitalFimAtual += lucroMes // Somar o lucro gerado ao capital fim

    // O verdadeiro Capital Médio Investido durante o mês
    const capitalMedio = capitalInicioGlobal + pesoNet

    const rentabilidade = capitalMedio > 0 ? lucroMes / capitalMedio : 0

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
      capitalInicio: capitalInicioGlobal,
      capitalAtual: capitalFimAtual,
      lucroMes,
      diasOperados: diasMesAtual.length,
      diasPositivos: diasPositivosMes,
      maiorSequenciaPositiva: maiorSeqPos,
      maiorSequenciaNegativa: maiorSeqNeg,
    }
  }

  const reservaAtualUSD = capStatus.bancaGlobalUSD - capStatus.capitalCorretoraUSD

  const movimentos = await prisma.depositoSaque.findMany({ where: { userId } })
  const totalAportes = movimentos.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorUSD, 0)
  const totalSaques  = movimentos.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorUSD, 0)

  // Mapear movimentos por data para o gráfico
  const movPorData: Record<string, { aportes: number, saques: number }> = {}
  for (const m of movimentos) {
    const dStr = m.data.toISOString().split('T')[0]
    if (!movPorData[dStr]) movPorData[dStr] = { aportes: 0, saques: 0 }
    if (m.tipo === 'DEPOSITO') movPorData[dStr].aportes += m.valorUSD
    if (m.tipo === 'SAQUE') movPorData[dStr].saques += m.valorUSD
  }

  // Pre-calcular a reserva histórica para cada dia
  const movsReserva = movimentos.filter(m => m.conta === 'RESERVA');
  const cambioConsiderado = config?.cambioCompra || 5.0;
  const baseReservaBRL = (config?.saldoInicialReserva ?? 0) * cambioConsiderado;

  const getReservaNoDia = (date: Date) => {
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const movsAteFimDia = movsReserva.filter(m => m.data <= dayEnd);
    const saldoBRL = baseReservaBRL + movsAteFimDia.reduce((sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL), 0);
    return saldoBRL / cambioConsiderado;
  };

  // Dados para gráfico de evolução de capital
  // O primeiro ponto mostra o capital INICIAL (dia anterior ao primeiro pregão),
  // os demais mostram a Banca Global (Corretora + Reserva Histórica) de cada dia fechado.
  const evolucaoCapital: { data: Date; capital: number; resultado: number; rentabilidade: number; totalTrades: number; taxaAcerto: number; aportes?: number; saques?: number }[] = []
  
  const movsCorretora = movimentos.filter(m => m.conta === 'CORRETORA')
  let currentCorretora = config?.saldoInicialCorretora ?? 0
  let lastDate = new Date(0)

  if (dias.length > 0) {
    const dataAntes = new Date(dias[0].date)
    dataAntes.setUTCDate(dataAntes.getUTCDate() - 1)
    dataAntes.setUTCHours(23, 59, 59, 999)
    
    // Ponto zero: usa capital inicial da corretora + reserva histórica no dia anterior
    const reservaAntes = getReservaNoDia(dataAntes)
    const movsAteAntes = movsCorretora.filter(m => m.data <= dataAntes)
    const netAteAntes = movsAteAntes.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)
    
    currentCorretora = (config?.saldoInicialCorretora ?? 0) + netAteAntes
    const capInit = currentCorretora + reservaAntes

    evolucaoCapital.push({ data: dataAntes, capital: capInit, resultado: 0, rentabilidade: 0, totalTrades: 0, taxaAcerto: 0 })
    lastDate = dataAntes
  }

  for (const d of dias) {
    const dStr = d.date.toISOString().split('T')[0]
    const mov = movPorData[dStr] || { aportes: 0, saques: 0 }
    
    // Calcular a banca global real daquele dia exato
    const reservaNoDia = getReservaNoDia(d.date)
    
    // Dinamicamente calcular a Corretora somando depósitos/saques e o resultado do dia
    const dayEnd = new Date(d.date)
    dayEnd.setUTCHours(23, 59, 59, 999)
    
    const movsNoPeriodo = movsCorretora.filter(m => m.data > lastDate && m.data <= dayEnd)
    const netMovs = movsNoPeriodo.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)
    
    currentCorretora += netMovs
    currentCorretora += (d.resultadoDia ?? 0)
    
    const capitalDia = currentCorretora + reservaNoDia
    
    lastDate = dayEnd

    evolucaoCapital.push({
      data: d.date,
      capital: capitalDia,
      resultado: d.resultadoDia ?? 0,
      rentabilidade: d.rentabilidade ?? 0,
      totalTrades: (d.win ?? 0) + (d.loss ?? 0),
      taxaAcerto: d.taxaAcerto ?? 0,
      aportes: mov.aportes,
      saques: mov.saques,
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
      sequenciaAtualGlobal,
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
