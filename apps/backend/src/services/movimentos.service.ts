import { MovimentoTipo } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { recalcularDia } from './dayCalculator'
import { recalcularRelatorios } from './relatorios.service'

interface CriarMovimentoInput {
  userId: string
  data: Date
  tipo: MovimentoTipo
  conta?: string
  valorUSD: number
  cambio: number
  observacao?: string
  faixaPlanejada?: string
}

// ─── Helper: sincroniza toda a cascata de TradingDays a partir de uma data ──────────────
async function syncTradingDayCascade(userId: string, dataAncora: Date) {
  // Pega a data a meia noite
  const startOfAncora = new Date(dataAncora)
  startOfAncora.setHours(0, 0, 0, 0)

  // Pega todos os dias operados a partir do dia afetado (ou do primeiro dia após ele)
  const diasAfetados = await prisma.tradingDay.findMany({
    where: { userId, date: { gte: startOfAncora } },
    orderBy: { date: 'asc' },
    include: { trades: true },
  })

  if (diasAfetados.length === 0) return // Nenhum dia futuro para recalcular

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) return

  // Busca o capitalFinal do dia IMEDIATAMENTE ANTERIOR à cascata
  const diaAnterior = await prisma.tradingDay.findFirst({
    where: { userId, date: { lt: startOfAncora }, isClosed: true },
    orderBy: { date: 'desc' },
  })
  
  // Se não tem dia anterior, usa o config.saldoInicial
  let prevCapCorretora = diaAnterior?.capitalFinal ?? config.saldoInicialCorretora

  // Agora percorremos e recalculamos cada dia na ordem cronológica
  for (const dia of diasAfetados) {
    const dayStart = new Date(dia.date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dia.date)
    dayEnd.setHours(23, 59, 59, 999)

    // Busca depósitos APENAS da Corretora PARA ESTE DIA
    const movsHoje = await prisma.depositoSaque.findMany({
      where: { userId, conta: 'CORRETORA', data: { gte: dayStart, lte: dayEnd } },
    })
    const netHoje = movsHoje.reduce((sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)

    // Busca TODOS depósitos e saques perdidos entre o dia anterior e este dia (órfãos)
    // Para simplificar, acumularemos o prevCapCorretora + netHoje, ignorando depósitos em dias sem pregão?
    // SIM: Depósitos em dias sem pregão devem somar no próximo pregão!
    // Qual foi a data do pregão anterior?
    const dataPrev = diaAnterior?.date ? new Date(diaAnterior.date) : new Date(0)
    if (dia.id === diasAfetados[0].id) {
       // Apenas no primeiro dia do loop, injeta o dinheiro que ficou órfão antes dele
       const movsOrfaos = await prisma.depositoSaque.findMany({
         where: { userId, conta: 'CORRETORA', data: { gt: dataPrev, lt: dayStart } }
       })
       const netOrfao = movsOrfaos.reduce((sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)
       prevCapCorretora += netOrfao
    } else {
       // Entre dias afetados
       const index = diasAfetados.findIndex(d => d.id === dia.id)
       const dataAntAfetado = new Date(diasAfetados[index - 1].date)
       const movsOrfaos = await prisma.depositoSaque.findMany({
         where: { userId, conta: 'CORRETORA', data: { gt: dataAntAfetado, lt: dayStart } }
       })
       const netOrfao = movsOrfaos.reduce((sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)
       prevCapCorretora += netOrfao
    }

    // Recalculo dinâmico da Reserva até este dia (Cumulativo) -> para Banca Global
    const movsReservaAcumulado = await prisma.depositoSaque.findMany({
      where: { userId, conta: 'RESERVA', data: { lte: dayEnd } }
    })
    const saldoReservaBRL = movsReservaAcumulado.reduce((sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL), 0)
    const reservaOuroUSD = saldoReservaBRL / (config.cambioCompra || 5.0)

    // Movs da Reserva apenas DESTE DIA
    const movsHojeReserva = await prisma.depositoSaque.findMany({
      where: { userId, conta: 'RESERVA', data: { gte: dayStart, lte: dayEnd } }
    })
    const netHojeReservaBRL = movsHojeReserva.reduce((sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL), 0)
    const depositoReserva = netHojeReservaBRL / (config.cambioCompra || 5.0)

    const capitalInicialReal = prevCapCorretora + netHoje
    const bancaGlobal = capitalInicialReal + reservaOuroUSD

    const calc = recalcularDia({ ...dia, capitalInicialReal, deposito: netHoje }, dia.trades, config, bancaGlobal)

    const statusFinal = (dia.isClosed && (calc.status === 'ATENCAO' || calc.status === 'OPERANDO') ? 'META_NAO_ATINGIDA' : calc.status) as typeof calc.status

    const capitalFinal = dia.isClosed ? capitalInicialReal + calc.resultadoDia : null

    await prisma.tradingDay.update({
      where: { id: dia.id },
      data: {
        deposito: netHoje,
        depositoReserva,
        capitalInicialReal,
        bancaGlobal,
        resultadoDia: calc.resultadoDia,
        rentabilidade: calc.rentabilidade,
        status: statusFinal,
        win: calc.win,
        loss: calc.loss,
        numeroTrades: calc.numeroTrades,
        taxaAcerto: calc.taxaAcerto,
        ciclosRealizados: calc.ciclosRealizados,
        ...(capitalFinal !== null ? { capitalFinal } : {}),
      },
    })

    // Prepara o capital para a próxima iteração
    if (capitalFinal !== null) {
      prevCapCorretora = capitalFinal
    } else {
      prevCapCorretora = capitalInicialReal // Se estiver aberto, carrega o cap inicial
    }
  }
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
    data: { ...input, conta: input.conta ?? 'CORRETORA', valorBRL, mes },
  })

  await syncTradingDayCascade(input.userId, data)
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
  await syncTradingDayCascade(userId, mov.data)
  await recalcularRelatorios(userId, mov.data)
  if (data.data && data.data.toISOString().slice(0, 10) !== mov.data.toISOString().slice(0, 10)) {
    await syncTradingDayCascade(userId, data.data)
    await recalcularRelatorios(userId, data.data)
  }

  return atualizado
}

export async function deletarMovimento(id: string, userId: string) {
  const mov = await prisma.depositoSaque.findFirst({ where: { id, userId } })
  if (!mov) throw new AppError('Movimentação não encontrada', 404)

  await prisma.depositoSaque.delete({ where: { id } })
  await syncTradingDayCascade(userId, mov.data)
  await recalcularRelatorios(userId, mov.data)
}
