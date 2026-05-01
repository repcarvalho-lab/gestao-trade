import { prisma } from '../lib/prisma'

/**
 * Retorna os saldos das contas e a Banca Global para um usuário
 */
export async function getCapitalStatus(userId: string) {
  // 1. Capital Atual na Corretora (Calculado dinamicamente para sempre refletir o Saldo Inicial das Configurações)
  let capitalCorretoraUSD = 0

  const config = await prisma.configuration.findUnique({ where: { userId } })
  const baseCorretora = config?.saldoInicialCorretora ?? 0

  const movsCorretora = await prisma.depositoSaque.findMany({
    where: { userId, conta: 'CORRETORA' }
  })
  const netCorretora = movsCorretora.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0
  )

  const diasFechados = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true },
    select: { resultadoDia: true }
  })
  const lucroFechados = diasFechados.reduce((sum, d) => sum + (d.resultadoDia ?? 0), 0)

  capitalCorretoraUSD = baseCorretora + netCorretora + lucroFechados

  const diaAberto = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false }
  })

  if (diaAberto) {
    capitalCorretoraUSD += (diaAberto.resultadoDia ?? 0)
  }

  // 2. Capital em Reserva (puramente livro-caixa BRL)
  const configReserva = await prisma.configuration.findUnique({ where: { userId } })
  const cambio = configReserva?.cambioCompra || 5.0

  const movsReserva = await prisma.depositoSaque.findMany({
    where: { 
      userId, 
      conta: 'RESERVA',
      data: configReserva?.dataSaldoInicial ? { gt: configReserva.dataSaldoInicial } : undefined
    }
  })

  const baseReservaBRL = (configReserva?.saldoInicialReserva ?? 0) * cambio

  const saldoReservaBRL = baseReservaBRL + movsReserva.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL),
    0
  )

  // 3. Banca Global (USD)
  const reservaOuroUSD = saldoReservaBRL / cambio
  
  const bancaGlobalUSD = capitalCorretoraUSD + reservaOuroUSD

  return {
    capitalCorretoraUSD,
    saldoReservaBRL,
    cambioConsiderado: cambio,
    bancaGlobalUSD,
  }
}
