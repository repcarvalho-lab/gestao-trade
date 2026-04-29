import { TradeType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { calcularResultadoTrade, recalcularDia } from './dayCalculator'

interface CriarTradeInput {
  userId: string
  tradingDayId: string
  tipo: TradeType
  ativo: string
  valor: number
  motivoId?: string
  motivoOutro?: string
}

export async function criarTrade(input: CriarTradeInput) {
  const { userId, tradingDayId, tipo, ativo, valor, motivoId, motivoOutro } = input

  const dia = await prisma.tradingDay.findFirst({
    where: { id: tradingDayId, userId, isClosed: false },
  })
  if (!dia) throw new AppError('Dia não encontrado ou já fechado', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Verifica se stop foi atingido (apenas visual, não bloqueia mais operações a pedido do usuário)
  const tradesExistentes = await prisma.trade.findMany({ where: { tradingDayId } })
  const calc = recalcularDia(dia, tradesExistentes, config, dia.bancaGlobal || dia.capitalInicialReal)

  // Verifica ciclos disponíveis
  const ciclosAbertos = await prisma.ciclo.findMany({
    where: { tradingDayId, status: 'ABERTO' },
    orderBy: { numero: 'desc' },
  })
  const totalCiclos = await prisma.ciclo.count({ where: { tradingDayId } })

  let ciclo

  if (tipo === 'ENTR') {
    // Cria novo ciclo (ignorando limite de MAX_CICLOS a pedido do usuário)
    ciclo = await prisma.ciclo.create({
      data: {
        userId,
        tradingDayId,
        numero: totalCiclos + 1,
        status: 'ABERTO',
      },
    })
  } else {
    // MG1 ou MG2 — usa ciclo aberto
    // MG1 ou MG2 — usa ciclo aberto ou revive o ultimo ciclo
    if (ciclosAbertos.length === 0) {
      if (tipo === 'MG2') {
        const ultimoCicloFechado = await prisma.ciclo.findFirst({
           where: { tradingDayId, status: 'FECHADO_STOP' },
           orderBy: { numero: 'desc' }
        });
        if (ultimoCicloFechado) {
          // Revive o ciclo para receber o MG2
          await prisma.ciclo.update({ where: { id: ultimoCicloFechado.id }, data: { status: 'ABERTO' } });
          ciclo = ultimoCicloFechado;
        } else {
          throw new AppError('Nenhum ciclo aberto encontrado para registrar o MG2.', 400);
        }
      } else {
        throw new AppError('Nenhum ciclo aberto encontrado. Inicie com uma entrada ENTR.', 400)
      }
    } else {
      ciclo = ciclosAbertos[0]
    }

    if (tipo === 'MG2' && !config.mg2Habilitado) {
      throw new AppError('MG2 está desabilitado nas configurações', 400)
    }
  }

  const trade = await prisma.trade.create({
    data: {
      userId,
      tradingDayId,
      cicloId: ciclo.id,
      tipo,
      ativo,
      valor,
      motivoId,
      motivoOutro,
      status: 'ABERTA',
    },
    include: { motivo: true, ciclo: true },
  })

  return trade
}

export async function marcarResultado(
  tradeId: string,
  userId: string,
  resultado: 'WIN' | 'LOSS',
) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, status: 'ABERTA' },
    include: { ciclo: true },
  })
  if (!trade) throw new AppError('Operação não encontrada ou já finalizada', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  const ativoObj = await prisma.ativo.findFirst({ where: { userId, nome: trade.ativo } })
  const payoutAplicado = ativoObj?.payout ?? 0.85

  const valorResultado = calcularResultadoTrade(trade.valor, resultado, payoutAplicado)

  // Atualiza o trade
  const tradeAtualizado = await prisma.trade.update({
    where: { id: tradeId },
    data: { status: resultado, resultado: valorResultado },
    include: { motivo: true, ciclo: true },
  })

  // Determina se o ciclo fecha
  let novoCicloStatus: 'FECHADO_WIN' | 'FECHADO_STOP' | null = null
  const totalInvestidoCiclo = trade.ciclo.totalInvestido + trade.valor

  if (resultado === 'WIN') {
    novoCicloStatus = 'FECHADO_WIN'
  } else {
    // LOSS — verifica se é o último trade do ciclo
    const tradesNoCiclo = await prisma.trade.findMany({
      where: { cicloId: trade.cicloId },
    })
    const tiposNosCiclo = tradesNoCiclo.map((t) => t.tipo)

    let ehUltimoTrade = false
    if (!config.mg2Habilitado && tiposNosCiclo.includes('MG1')) ehUltimoTrade = true
    if (config.mg2Habilitado && tiposNosCiclo.includes('MG2')) ehUltimoTrade = true

    // Caso de seguranca: Se mg2Habilitado for verdadeiro, mas nao existe MG2, NUNCA fechara.
    if (ehUltimoTrade) {
      novoCicloStatus = 'FECHADO_STOP'
    }
  }

  // Atualiza ciclo
  const resultadoCiclo = novoCicloStatus ? valorResultado : undefined
  await prisma.ciclo.update({
    where: { id: trade.cicloId },
    data: {
      totalInvestido: totalInvestidoCiclo,
      ...(novoCicloStatus ? { status: novoCicloStatus, resultado: resultadoCiclo } : {}),
    },
  })

  // Recalcula dia
  const dia = await prisma.tradingDay.findUnique({ where: { id: trade.tradingDayId } })
  if (dia) {
    const todosOsTrades = await prisma.trade.findMany({
      where: { tradingDayId: trade.tradingDayId },
    })
    const calc = recalcularDia(dia, todosOsTrades, config, dia.bancaGlobal || dia.capitalInicialReal)
    await prisma.tradingDay.update({
      where: { id: trade.tradingDayId },
      data: {
        resultadoDia: calc.resultadoDia,
        rentabilidade: calc.rentabilidade,
        status: calc.status,
        win: calc.win,
        loss: calc.loss,
        numeroTrades: calc.numeroTrades,
        taxaAcerto: calc.taxaAcerto,
        ciclosRealizados: calc.ciclosRealizados,
      },
    })
  }

  return tradeAtualizado
}

export async function editarTrade(
  tradeId: string,
  userId: string,
  updates: {
    ativo?: string
    valor?: number
    motivoId?: string | null
    motivoOutro?: string | null
  },
) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId },
    include: { ciclo: true },
  })
  if (!trade) throw new AppError('Trade não encontrado', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Recalcula resultado se valor mudou e o trade já foi finalizado
  let novoResultado = trade.resultado
  if (updates.valor !== undefined && trade.status !== 'ABERTA') {
    const ativoNome = updates.ativo ?? trade.ativo
    const ativoObj = await prisma.ativo.findFirst({ where: { userId, nome: ativoNome } })
    const payout = ativoObj?.payout ?? 0.85
    novoResultado = calcularResultadoTrade(updates.valor, trade.status as 'WIN' | 'LOSS', payout)
  }

  const tradeAtualizado = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      ...(updates.ativo !== undefined ? { ativo: updates.ativo } : {}),
      ...(updates.valor !== undefined ? { valor: updates.valor, resultado: novoResultado } : {}),
      ...(updates.motivoId !== undefined ? { motivoId: updates.motivoId } : {}),
      ...(updates.motivoOutro !== undefined ? { motivoOutro: updates.motivoOutro } : {}),
    },
    include: { motivo: true, ciclo: true },
  })

  // Recalcula totalInvestido do ciclo
  const tradesNoCiclo = await prisma.trade.findMany({ where: { cicloId: trade.cicloId } })
  const totalInvestidoCiclo = tradesNoCiclo.reduce((sum, t) => sum + t.valor, 0)

  // Recalcula resultado do ciclo se estava fechado
  const cicloFechado = trade.ciclo.status !== 'ABERTO'
  const resultadoCiclo = cicloFechado
    ? tradesNoCiclo[tradesNoCiclo.length - 1]?.resultado ?? null
    : null

  await prisma.ciclo.update({
    where: { id: trade.cicloId },
    data: {
      totalInvestido: totalInvestidoCiclo,
      ...(cicloFechado && resultadoCiclo !== null ? { resultado: resultadoCiclo } : {}),
    },
  })

  // Recalcula o dia
  const dia = await prisma.tradingDay.findUnique({ where: { id: trade.tradingDayId } })
  if (dia) {
    const todos = await prisma.trade.findMany({ where: { tradingDayId: trade.tradingDayId } })
    const calc = recalcularDia(dia, todos, config, dia.bancaGlobal || dia.capitalInicialReal)
    await prisma.tradingDay.update({
      where: { id: trade.tradingDayId },
      data: {
        resultadoDia: calc.resultadoDia,
        rentabilidade: calc.rentabilidade,
        status: calc.status,
        win: calc.win,
        loss: calc.loss,
        numeroTrades: calc.numeroTrades,
        taxaAcerto: calc.taxaAcerto,
        ciclosRealizados: calc.ciclosRealizados,
      },
    })
  }

  return tradeAtualizado
}

export async function listarTradesDoDia(tradingDayId: string, userId: string) {
  return prisma.trade.findMany({
    where: { tradingDayId, userId },
    orderBy: { horario: 'asc' },
    include: { motivo: true, ciclo: true },
  })
}

export async function excluirTrade(tradeId: string, userId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId },
    include: { ciclo: true }
  })
  if (!trade) throw new AppError('Trade não encontrado', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  console.log(`[TradeService] Excluindo trade ${tradeId} do usuário ${userId}`)
  // 1. Exclui a operação explicitamente
  await prisma.trade.delete({ where: { id: tradeId } })
  console.log(`[TradeService] Trade deletado. Reavaliando ciclo ${trade.cicloId}`)

  // 2. Re-avalia o ciclo correspondente
  const tradesRestantes = await prisma.trade.findMany({
    where: { cicloId: trade.cicloId },
    orderBy: { horario: 'asc' }
  })

  // Se não sobrou nenhum trade contido, o ciclo inteiro perde o sentido de existir
  if (tradesRestantes.length === 0) {
    await prisma.ciclo.delete({ where: { id: trade.cicloId } })
  } else {
    // Se sobrou algum, precisamos recalcular os status vitais do ciclo e o dinheiro amarrado nele 
    const totalInvestidoCiclo = tradesRestantes.reduce((sum, t) => sum + t.valor, 0)
    let novoCicloStatus: 'ABERTO' | 'FECHADO_WIN' | 'FECHADO_STOP' = 'ABERTO'
    const ultimo = tradesRestantes[tradesRestantes.length - 1]
    
    if (ultimo.status === 'WIN') {
      novoCicloStatus = 'FECHADO_WIN'
    } else if (ultimo.status === 'LOSS') {
      const tiposNosCiclo = tradesRestantes.map(t => t.tipo)
      let ehUltimo = false
      if (!config.mg2Habilitado && tiposNosCiclo.includes('MG1')) ehUltimo = true
      if (config.mg2Habilitado && tiposNosCiclo.includes('MG2')) ehUltimo = true
      if (ehUltimo) novoCicloStatus = 'FECHADO_STOP'
    }

    const resultadoCiclo = novoCicloStatus !== 'ABERTO' ? ultimo.resultado : undefined

    await prisma.ciclo.update({
      where: { id: trade.cicloId },
      data: {
        totalInvestido: totalInvestidoCiclo,
        status: novoCicloStatus,
        resultado: resultadoCiclo ?? null
      }
    })
  }

  // 3. Recalcula o dia no geral com base nessa remoção 
  const dia = await prisma.tradingDay.findUnique({ where: { id: trade.tradingDayId } })
  if (dia) {
    const todosOsTradesDia = await prisma.trade.findMany({
      where: { tradingDayId: trade.tradingDayId }
    })
    const calc = recalcularDia(dia, todosOsTradesDia, config, dia.bancaGlobal || dia.capitalInicialReal)
    console.log(`[TradeService] Recalculando dia. Novo status: ${calc.status}, Trades: ${calc.numeroTrades}`)
    await prisma.tradingDay.update({
      where: { id: trade.tradingDayId },
      data: {
        resultadoDia: calc.resultadoDia,
        rentabilidade: calc.rentabilidade,
        status: calc.status,
        win: calc.win,
        loss: calc.loss,
        numeroTrades: calc.numeroTrades,
        taxaAcerto: calc.taxaAcerto,
        ciclosRealizados: calc.ciclosRealizados,
        usouMG2: todosOsTradesDia.some(t => t.tipo === 'MG2')
      }
    })
  }
  console.log(`[TradeService] Processo de exclusão concluído para ${tradeId}`)
}
