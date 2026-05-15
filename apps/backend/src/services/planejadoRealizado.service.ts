import { prisma } from '../lib/prisma'
import { getCapitalStatus } from './capital.service'

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
    } else {
      const ultimoDiaGeral = await prisma.tradingDay.findFirst({
        where: { userId, isClosed: true },
        orderBy: { date: 'desc' },
        select: { capitalFinal: true },
      })
      const fallbackCapital = ultimoDiaGeral?.capitalFinal ?? config?.saldoInicialCorretora ?? 0;
      mesAtual = { mes: mesAtualStr, capitalInicial: fallbackCapital }
    }
  }

  // Busca todos os movimentos para calcular Banca Global e Prorrateios
  const todosMovimentosBrutos = await prisma.depositoSaque.findMany({
    where: { userId },
    orderBy: { data: 'asc' }
  })
  
  const dataSaldoInicialMonth = config?.dataSaldoInicial ? config.dataSaldoInicial.toISOString().slice(0, 7) : null;
  const todosMovimentos = dataSaldoInicialMonth 
    ? todosMovimentosBrutos.filter(mov => mov.mes >= dataSaldoInicialMonth)
    : todosMovimentosBrutos;

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

  // Coleta todos os meses distintos que têm relatórios OU movimentos
  const allMonthsSet = new Set<string>();
  meses.forEach(m => allMonthsSet.add(m.mes));
  todosMovimentos.forEach(mov => allMonthsSet.add(mov.mes));
  if (dataSaldoInicialMonth) {
    allMonthsSet.add(dataSaldoInicialMonth);
  }
  
  let allMonths = Array.from(allMonthsSet).sort();

  // Se o usuário definiu que a Banca Global começa no mês X, ignoramos o histórico anterior
  if (dataSaldoInicialMonth) {
    allMonths = allMonths.filter(m => m >= dataSaldoInicialMonth);
  }

  // Dynamically calculate Banca Global to reflect any config changes
  let currentCorretora = config?.saldoInicialCorretora ?? 0;
  let currentReservaUSD = config?.saldoInicialReserva ?? 0;

  const mesesComMov = allMonths.map(mesStr => {
    // Busca o relatório mensal se existir
    const m = meses.find(x => x.mes === mesStr) || {
      id: `synthetic-${mesStr}`,
      userId,
      mes: mesStr,
      dataBase: new Date(`${mesStr}-01T12:00:00Z`),
      diasOperados: 0,
      diasPositivos: 0,
      diasNegativos: 0,
      capitalInicial: currentCorretora,
      capitalFinal: currentCorretora,
      vlDepositadoSacado: 0,
      lucroTotal: 0,
      rentabMedia: 0,
      rentabTotal: 0,
      retornoClassif: 'CONSERVADOR' as any,
      taxaAcertoMedia: 0,
      maiorGain: 0,
      maiorLoss: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Aportes e saques na corretora neste mes
    const movsCorretoraMes = todosMovimentos.filter(mov => mov.mes === mesStr && mov.conta === 'CORRETORA');
    const netCorretora = movsCorretoraMes.reduce((s, mov) => s + (mov.tipo === 'DEPOSITO' ? mov.valorUSD : -mov.valorUSD), 0);
    
    // Aportes e saques na reserva neste mes
    const movsReservaMes = todosMovimentos.filter(mov => mov.mes === mesStr && mov.conta === 'RESERVA');
    const netReservaBRL = movsReservaMes.reduce((s, mov) => s + (mov.tipo === 'DEPOSITO' ? mov.valorBRL : -mov.valorBRL), 0);
    const netReservaUSD = netReservaBRL / (config?.cambioCompra || 5.0);

    const bancaGlobalInicial = currentCorretora + currentReservaUSD;

    currentCorretora += netCorretora + m.lucroTotal;
    currentReservaUSD += netReservaUSD;

    const bancaGlobalFinal = currentCorretora + currentReservaUSD;

    return {
      ...m,
      bancaGlobalInicial,
      bancaGlobalFinal,
      aporteReal: movMap[mesStr]?.aporte || 0,
      saqueReal: movMap[mesStr]?.saque || 0,
      pesoNet: movMap[mesStr]?.pesoNet || 0,
    }
  })

  let mesAtualComMov = null
  if (mesAtual) {
    const capitalStatus = await getCapitalStatus(userId)
    
    const movsCorretoraMesAtual = todosMovimentos.filter(mov => mov.mes === mesAtual.mes && mov.conta === 'CORRETORA');
    const netCorretoraAtual = movsCorretoraMesAtual.reduce((s, mov) => s + (mov.tipo === 'DEPOSITO' ? mov.valorUSD : -mov.valorUSD), 0);
    
    mesAtualComMov = {
      ...mesAtual,
      bancaGlobalInicial: currentCorretora + currentReservaUSD,
      bancaGlobalFinal: capitalStatus.bancaGlobalUSD,
      aporteReal: movMap[mesAtual.mes]?.aporte || 0,
      saqueReal: movMap[mesAtual.mes]?.saque || 0,
      pesoNet: movMap[mesAtual.mes]?.pesoNet || 0,
    }
  }

  // The config month injection is no longer needed since it's already added to allMonthsSet

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
