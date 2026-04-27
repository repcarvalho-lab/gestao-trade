import { MovimentoTipo } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { recalcularDia } from './dayCalculator'
import { recalcularRelatorios } from './relatorios.service'

interface CriarMovimentoInput {
  userId: string
  data: Date
  tipo: MovimentoTipo
  valorUSD: number
  cambio: number
  observacao?: string
  faixaPlanejada?: string
}

// ─── Helper: sincroniza TradingDay.deposito para a data informada ──────────────
async function syncTradingDayDeposito(userId: string, data: Date) {
  const dateStr = data.toISOString().slice(0, 10) // "YYYY-MM-DD"
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
  const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`)

  // Soma todos os depósitos/saques do dia
  const movimentos = await prisma.depositoSaque.findMany({
    where: { userId, data: { gte: dayStart, lte: dayEnd } },
  })

  const net = movimentos.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0,
  )

  // Busca TradingDay para essa data (aberto ou fechado)
  const tradingDay = await prisma.tradingDay.findFirst({
    where: { userId, date: dayStart },
    include: { trades: true },
  })
  if (!tradingDay) return

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) return

  const capitalInicialReal = tradingDay.capitalInicial + net
  const calc = recalcularDia({ ...tradingDay, capitalInicialReal, deposito: net }, tradingDay.trades, config)

  // Para dias fechados, mantém META_NAO_ATINGIDA se o status recalculado for ATENCAO/OPERANDO
  const statusFinal = (
    tradingDay.isClosed && (calc.status === 'ATENCAO' || calc.status === 'OPERANDO')
      ? 'META_NAO_ATINGIDA'
      : calc.status
  ) as typeof calc.status

  await prisma.tradingDay.update({
    where: { id: tradingDay.id },
    data: {
      deposito: net,
      capitalInicialReal,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      status: statusFinal,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
      ...(tradingDay.isClosed ? { capitalFinal: capitalInicialReal + calc.resultadoDia } : {}),
    },
  })
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

async function validarDataMovimento(userId: string, dataInput: Date) {
  const dataMovimento = new Date(dataInput)
  dataMovimento.setHours(0, 0, 0, 0)
  
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  if (dataMovimento > hoje) {
    throw new AppError('A data não pode ser no futuro.', 400)
  }

  const ultimoDia = await prisma.tradingDay.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  })

  if (!ultimoDia) return

  const dataUltimoDia = new Date(ultimoDia.date)
  dataUltimoDia.setHours(0, 0, 0, 0)

  if (dataMovimento < dataUltimoDia) {
    // Format "13/04/2026"
    const msStr = String(dataUltimoDia.getMonth() + 1).padStart(2, '0')
    const dyStr = String(dataUltimoDia.getDate()).padStart(2, '0')
    const anoStr = dataUltimoDia.getFullYear()
    throw new AppError(`A data não pode ser anterior ao último dia operado (${dyStr}/${msStr}/${anoStr}).`, 400)
  }
}

export async function criarMovimento(input: CriarMovimentoInput) {
  const { data, valorUSD, cambio } = input
  
  await validarDataMovimento(input.userId, data)

  const valorBRL = valorUSD * cambio
  const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`

  const mov = await prisma.depositoSaque.create({
    data: { ...input, valorBRL, mes },
  })

  await syncTradingDayDeposito(input.userId, data)
  await recalcularRelatorios(input.userId, data)
  return mov
}

export async function listarMovimentos(userId: string, dataFiltro?: string) {
  if (dataFiltro) {
    const dayStart = new Date(`${dataFiltro}T00:00:00.000Z`)
    const dayEnd   = new Date(`${dataFiltro}T23:59:59.999Z`)
    return prisma.depositoSaque.findMany({
      where: { userId, data: { gte: dayStart, lte: dayEnd } },
      orderBy: { data: 'asc' },
    })
  }
  return prisma.depositoSaque.findMany({
    where: { userId },
    orderBy: { data: 'desc' },
  })
}

export async function atualizarMovimento(
  id: string,
  userId: string,
  data: Partial<CriarMovimentoInput>,
) {
  if (data.data) {
    await validarDataMovimento(userId, data.data)
  }

  const mov = await prisma.depositoSaque.findFirst({ where: { id, userId } })
  if (!mov) throw new AppError('Movimentação não encontrada', 404)

  const valorBRL = data.valorUSD && data.cambio ? data.valorUSD * data.cambio : undefined
  const atualizado = await prisma.depositoSaque.update({
    where: { id },
    data: { ...data, ...(valorBRL ? { valorBRL } : {}) },
  })

  // Sincroniza a data original e a nova (se a data mudou)
  await syncTradingDayDeposito(userId, mov.data)
  await recalcularRelatorios(userId, mov.data)
  if (data.data && data.data.toISOString().slice(0, 10) !== mov.data.toISOString().slice(0, 10)) {
    await syncTradingDayDeposito(userId, data.data)
    await recalcularRelatorios(userId, data.data)
  }

  return atualizado
}

export async function deletarMovimento(id: string, userId: string) {
  const mov = await prisma.depositoSaque.findFirst({ where: { id, userId } })
  if (!mov) throw new AppError('Movimentação não encontrada', 404)

  await prisma.depositoSaque.delete({ where: { id } })
  await syncTradingDayDeposito(userId, mov.data)
  await recalcularRelatorios(userId, mov.data)
}
