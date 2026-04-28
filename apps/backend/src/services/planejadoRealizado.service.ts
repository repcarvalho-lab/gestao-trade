import { prisma } from '../lib/prisma'

export async function getPlanejadoRealizado(userId: string) {
  const meses = await prisma.monthlyReport.findMany({
    where: { userId },
    orderBy: { mes: 'asc' },
  })

  const config = await prisma.configuration.findUnique({ where: { userId } })

  const agora = new Date()
  const inicioMesAtual = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1))
  const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const mesAtualJaFechado = meses.some(m => m.mes === mesAtualStr)

  let mesAtual: { mes: string; capitalInicial: number } | null = null
  if (!mesAtualJaFechado) {
    const ultimoDiaFechadoMesAtual = await prisma.tradingDay.findFirst({
      where: { userId, isClosed: true, date: { gte: inicioMesAtual } },
      orderBy: { date: 'desc' },
      select: { capitalFinal: true },
    })
    if (ultimoDiaFechadoMesAtual?.capitalFinal != null) {
      mesAtual = { mes: mesAtualStr, capitalInicial: ultimoDiaFechadoMesAtual.capitalFinal }
    }
  }

  // Busca todos os movimentos para calcular Banca Global e Prorrateios
  const todosMovimentos = await prisma.depositoSaque.findMany({
    where: { userId },
    orderBy: { data: 'asc' }
  })

  // Agrupa os movimentos por mês
  const movMap: Record<string, { aporte: number; saque: number; pesoNet: number }> = {}
  
  // Para calcular Saldo da Reserva acumulado até cada mês
  let saldoReservaAcumulado = 0
  const saldoReservaHistorico: Record<string, number> = {} // Saldo no final do mês

  // Variável para simular iteração mês a mês e salvar histórico
  let prevMes = ''
  
  for (const mov of todosMovimentos) {
    const m = mov.mes
    
    // Se mudou de mês, salvar o último saldo acumulado ANTES do início do novo mês
    if (prevMes !== '' && prevMes !== m) {
      saldoReservaHistorico[prevMes] = saldoReservaAcumulado
    }
    prevMes = m

    if (mov.conta === 'RESERVA') {
      if (mov.tipo === 'DEPOSITO') saldoReservaAcumulado += mov.valorUSD
      if (mov.tipo === 'SAQUE') saldoReservaAcumulado -= mov.valorUSD
    }

    if (!movMap[m]) movMap[m] = { aporte: 0, saque: 0, pesoNet: 0 }
    
    const isDeposit = mov.tipo === 'DEPOSITO'
    if (isDeposit) movMap[m].aporte += mov.valorUSD
    else movMap[m].saque += mov.valorUSD

    // Cálculo do peso do Prorrateio para Aportes/Saques GLOBAIS
    // Dias no mês:
    const [anoStr, mesStr] = m.split('-')
    const ano = Number(anoStr)
    const mesNum = Number(mesStr)
    const diasNoMes = new Date(ano, mesNum, 0).getDate()
    
    const diaMov = mov.data.getUTCDate()
    // Aporte rende juros também no dia em que é feito (fórmula: diasNoMes - diaMov + 1)
    const diasRestantes = Math.max(0, diasNoMes - diaMov + 1)
    const ratio = diasRestantes / diasNoMes
    
    const effect = isDeposit ? mov.valorUSD : -mov.valorUSD
    movMap[m].pesoNet += effect * ratio
  }
  // Última atualização para o mês corrente
  if (prevMes !== '') {
    saldoReservaHistorico[prevMes] = saldoReservaAcumulado
  }

  // Função helper para obter saldo da reserva no fechamento do mês
  function getReservaAt(mes: string) {
    // Se não houver movimento EXATO neste mês, precisamos do saldo do último mês que teve.
    // Vamos iterar os movimentos cronologicamente, ou verificar do início até o mês.
    // Simplificação: apenas calcule o saldo recalculando de novo.
    let sum = 0
    for (const mov of todosMovimentos) {
      if (mov.mes > mes) break
      if (mov.conta === 'RESERVA') {
        sum += mov.tipo === 'DEPOSITO' ? mov.valorUSD : -mov.valorUSD
      }
    }
    return sum
  }

  function getReservaAnteriorAt(mesAtualStr: string) {
    let sum = 0
    for (const mov of todosMovimentos) {
      if (mov.mes >= mesAtualStr) break
      if (mov.conta === 'RESERVA') {
        sum += mov.tipo === 'DEPOSITO' ? mov.valorUSD : -mov.valorUSD
      }
    }
    return sum
  }

  const mesesComMov = meses.map(m => {
    const reserva = getReservaAt(m.mes)
    const reservaAnt = getReservaAnteriorAt(m.mes)
    return {
      ...m,
      bancaGlobalInicial: m.capitalInicial + reservaAnt,
      bancaGlobalFinal: m.capitalFinal + reserva, 
      aporteReal: movMap[m.mes]?.aporte || 0,
      saqueReal: movMap[m.mes]?.saque || 0,
      pesoNet: movMap[m.mes]?.pesoNet || 0,
    }
  })

  let mesAtualComMov = null
  if (mesAtual) {
    const reservaAtual = getReservaAt(mesAtual.mes)
    const reservaAnt = getReservaAnteriorAt(mesAtual.mes)
    mesAtualComMov = {
      ...mesAtual,
      bancaGlobalInicial: mesAtual.capitalInicial + reservaAnt, // Ponto de partida do mês corrente (usa reservaAnt pois a reserva pode ter mudado no mês atual, e o capital inicial é do início do mês)
      bancaGlobalFinal: mesAtual.capitalInicial + reservaAtual, // Estimativa parcial com reserva atual
      aporteReal: movMap[mesAtual.mes]?.aporte || 0,
      saqueReal: movMap[mesAtual.mes]?.saque || 0,
      pesoNet: movMap[mesAtual.mes]?.pesoNet || 0,
    }
  }

  return {
    meses: mesesComMov,
    mesAtual: mesAtualComMov,
    config: {
      retornoConservador: config?.retornoConservador ?? 0.20,
      retornoRealista:    config?.retornoRealista    ?? 0.40,
      retornoAgressivo:   config?.retornoAgressivo   ?? 0.60,
    },
  }
}
