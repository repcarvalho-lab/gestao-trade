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

  // Verifica se stop foi atingido
  const tradesExistentes = await prisma.trade.findMany({ where: { tradingDayId } })
  const calc = recalcularDia(dia, tradesExistentes, config)
  if (calc.status === 'STOP') {
    throw new AppError('Stop diário atingido. Não é possível registrar novas operações.', 400)
  }

  // Verifica ciclos disponíveis
  const ciclosAbertos = await prisma.ciclo.findMany({
    where: { tradingDayId, status: 'ABERTO' },
  })
  const totalCiclos = await prisma.ciclo.count({ where: { tradingDayId } })

  let ciclo

  if (tipo === 'ENTR') {
    // Verifica limite de ciclos
    if (totalCiclos >= config.maxCiclosPorDia) {
      throw new AppError(
        `Limite de ${config.maxCiclosPorDia} ciclos por dia atingido`,
        400,
      )
    }
    // Cria novo ciclo
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
    if (ciclosAbertos.length === 0) {
      throw new AppError('Nenhum ciclo aberto encontrado. Inicie com uma entrada ENTR.', 400)
    }
    ciclo = ciclosAbertos[0]

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

  const valorResultado = calcularResultadoTrade(trade.valor, resultado, config)

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

    const ehUltimoTrade =
      (!config.mg2Habilitado && tiposNosCiclo.includes('MG1')) ||
      (config.mg2Habilitado && tiposNosCiclo.includes('MG2'))

    if (ehUltimoTrade) novoCicloStatus = 'FECHADO_STOP'
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
    const calc = recalcularDia(dia, todosOsTrades, config)
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
