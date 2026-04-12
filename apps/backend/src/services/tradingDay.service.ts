import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { recalcularDia, calcularValoresSugeridos } from './dayCalculator'
import { recalcularRelatorios } from './relatorios.service'

export async function getDiaAberto(userId: string) {
  return prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
    include: {
      trades: { orderBy: { horario: 'asc' } },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })
}

export async function criarDia(userId: string, capitalInicialOverride?: number) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Verifica se já existe dia aberto
  const existente = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
  })
  if (existente) throw new AppError('Já existe um dia em aberto', 409)

  // Verifica se já existe trading day para hoje
  const jaExiste = await prisma.tradingDay.findFirst({
    where: { userId, date: hoje },
  })
  if (jaExiste) throw new AppError('Já existe um dia registrado para hoje', 409)

  // Carry-over do dia anterior
  const ultimoDia = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: true },
    orderBy: { date: 'desc' },
  })

  const capitalInicial = capitalInicialOverride ?? ultimoDia?.capitalFinal ?? 0
  if (!capitalInicial && !capitalInicialOverride) {
    throw new AppError('Informe o capital inicial para o primeiro dia', 400)
  }

  return prisma.tradingDay.create({
    data: {
      userId,
      date: hoje,
      capitalInicial,
      capitalInicialReal: capitalInicial,
      status: 'OPERANDO',
    },
    include: { trades: true, ciclos: true },
  })
}

export async function atualizarDeposito(tradingDayId: string, userId: string, deposito: number) {
  const dia = await prisma.tradingDay.findFirst({ where: { id: tradingDayId, userId, isClosed: false } })
  if (!dia) throw new AppError('Dia não encontrado ou já fechado', 404)

  const capitalInicialReal = dia.capitalInicial + deposito

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Recalcula valores com novo capital
  const trades = await prisma.trade.findMany({ where: { tradingDayId } })
  const calc = recalcularDia({ ...dia, capitalInicialReal, deposito }, trades, config)

  return prisma.tradingDay.update({
    where: { id: tradingDayId },
    data: {
      deposito,
      capitalInicialReal,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      status: calc.status,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
    },
    include: { trades: true, ciclos: true },
  })
}

export async function fecharDia(
  tradingDayId: string,
  userId: string,
  emocional: string,
  seguiuSetup: boolean,
) {
  const dia = await prisma.tradingDay.findFirst({
    where: { id: tradingDayId, userId, isClosed: false },
    include: { trades: true },
  })
  if (!dia) throw new AppError('Dia não encontrado ou já fechado', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  const calc = recalcularDia(dia, dia.trades, config)
  const capitalFinal = dia.capitalInicialReal + calc.resultadoDia
  const respeitouLimiteCiclos = calc.ciclosRealizados <= config.maxCiclosPorDia

  const diafechado = await prisma.tradingDay.update({
    where: { id: tradingDayId },
    data: {
      isClosed: true,
      capitalFinal,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      status: calc.status,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
      respeitouLimiteCiclos,
      emocional,
      seguiuSetup,
      usouMG2: dia.trades.some((t) => t.tipo === 'MG2'),
    },
  })

  // Recalcula relatórios semanais e mensais
  await recalcularRelatorios(userId, diafechado.date)

  return diafechado
}

export async function listarDias(userId: string) {
  return prisma.tradingDay.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { trades: true } },
    },
  })
}

export async function getDia(id: string, userId: string) {
  const dia = await prisma.tradingDay.findFirst({
    where: { id, userId },
    include: {
      trades: {
        orderBy: { horario: 'asc' },
        include: { motivo: true },
      },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })
  if (!dia) throw new AppError('Dia não encontrado', 404)
  return dia
}

export async function getDiaComIndicadores(userId: string) {
  const dia = await getDiaAberto(userId)
  if (!dia) return null

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) return dia

  const calc = recalcularDia(dia, dia.trades, config)
  const sugeridos = calcularValoresSugeridos(dia.capitalInicialReal, config)

  return { ...dia, ...calc, ...sugeridos }
}
