import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { recalcularDia, calcularValoresSugeridos } from './dayCalculator'
import { recalcularRelatorios } from './relatorios.service'

export async function getDiaAberto(userId: string) {
  return prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
    include: {
      trades: {
        orderBy: { horario: 'asc' },
        include: { ciclo: true, motivo: true },
      },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })
}

export async function criarDia(userId: string, capitalInicialOverride?: number, dataParam?: string) {
  // Resolve a data: usa a fornecida ou hoje
  const dataEscolhida = dataParam ? new Date(`${dataParam}T00:00:00`) : new Date()
  dataEscolhida.setHours(0, 0, 0, 0)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const isRetroativo = dataEscolhida < hoje

  // Verifica se já existe dia aberto (bloqueia criação se tiver um aberto)
  const existente = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
  })
  if (existente) throw new AppError('Já existe um dia em aberto. Feche-o antes de criar outro.', 409)

  // Verifica se já existe day para a data escolhida
  const jaExiste = await prisma.tradingDay.findFirst({
    where: { userId, date: dataEscolhida },
  })
  if (jaExiste) throw new AppError(
    isRetroativo
      ? `Já existe um dia registrado para ${dataEscolhida.toLocaleDateString('pt-BR')}.`
      : 'Já existe um dia registrado para hoje.',
    409,
  )

  // Carry-over: busca o dia fechado mais recente ANTES da data escolhida
  const ultimoDia = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: true, date: { lt: dataEscolhida } },
    orderBy: { date: 'desc' },
  })

  // 1. Busca todos depósitos anteriores à data escolhida, mas APÓS o ultimo dia
  const gtDate = ultimoDia ? ultimoDia.date : undefined
  const movsAnteriores = await prisma.depositoSaque.findMany({
    where: {
      userId,
      data: {
        ...(gtDate ? { gt: gtDate } : {}),
        lt: dataEscolhida,
      },
    },
  })

  const netAnteriores = movsAnteriores.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0
  )

  const capitalInicial = capitalInicialOverride ?? ((ultimoDia?.capitalFinal ?? 0) + netAnteriores)
  if (!capitalInicial && !capitalInicialOverride) {
    throw new AppError('Informe o capital inicial para este dia.', 400)
  }

  // 2. Busca depósitos que foram realizados EXACTAMENTE no dia de hoje (antes do dia ser criado)
  const dayEnd = new Date(dataEscolhida)
  dayEnd.setHours(23, 59, 59, 999)

  const movsHoje = await prisma.depositoSaque.findMany({
    where: {
      userId,
      data: {
        gte: dataEscolhida,
        lte: dayEnd,
      },
    },
  })

  const netHoje = movsHoje.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0
  )

  return prisma.tradingDay.create({
    data: {
      userId,
      date: dataEscolhida,
      capitalInicial,
      deposito: netHoje,
      capitalInicialReal: capitalInicial + netHoje,
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
  errosDia: string[] = [],
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

  // ATENCAO e OPERANDO ao fechar = Meta não atingida
  const statusFinal =
    calc.status === 'ATENCAO' || calc.status === 'OPERANDO'
      ? 'META_NAO_ATINGIDA'
      : calc.status

  const diafechado = await prisma.tradingDay.update({
    where: { id: tradingDayId },
    data: {
      isClosed: true,
      capitalFinal,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      status: statusFinal,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
      respeitouLimiteCiclos,
      emocional,
      seguiuSetup,
      errosDia: { set: errosDia },
      usouMG2: dia.trades.some((t) => t.tipo === 'MG2'),
    },
  })

  // Recalcula relatórios semanais e mensais
  await recalcularRelatorios(userId, diafechado.date)

  return diafechado
}

export async function reabrirDia(id: string, userId: string) {
  // Garante que não haja outro dia aberto
  const existeAberto = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
  })
  if (existeAberto) throw new AppError('Já existe um dia em aberto. Feche-o antes de reabrir outro.', 409)

  const dia = await prisma.tradingDay.findFirst({
    where: { id, userId, isClosed: true },
    include: { trades: true },
  })
  if (!dia) throw new AppError('Dia não encontrado ou já está aberto', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Recalcula o status real a partir dos trades (remove META_NAO_ATINGIDA)
  const calc = recalcularDia(dia, dia.trades, config)

  return prisma.tradingDay.update({
    where: { id },
    data: {
      isClosed: false,
      capitalFinal: null,
      respeitouLimiteCiclos: null,
      status: calc.status,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
    },
    include: {
      trades: { orderBy: { horario: 'asc' }, include: { ciclo: true, motivo: true } },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })
}

export async function excluirDia(id: string, userId: string) {
  const dia = await prisma.tradingDay.findFirst({
    where: { id, userId },
    include: { _count: { select: { trades: true } } },
  })
  if (!dia) throw new AppError('Dia não encontrado', 404)
  if (dia._count.trades > 0)
    throw new AppError('Só é possível excluir um dia sem operações registradas.', 400)
  await prisma.tradingDay.delete({ where: { id } })
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
        include: { motivo: true, ciclo: true },
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
