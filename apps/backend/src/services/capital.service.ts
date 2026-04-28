import { prisma } from '../lib/prisma'

/**
 * Retorna os saldos das contas e a Banca Global para um usuário
 */
export async function getCapitalStatus(userId: string) {
  // 1. Capital Atual na Corretora (puxado do Dia de Trade em aberto, ou do último fechado + novos depósitos)
  // Como as regras de capital Inicial/Final dependem muito do dia de hoje, a forma mais segura
  // é buscar o dia em aberto se existir, senão o último fechado se sim.
  let capitalCorretoraUSD = 0

  const diaAberto = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
  })

  // Para garantir precisão com depósitos pós-último dia e antes de um novo dia
  // já existe lógica similar na criação do dia. Vamos usar o getCapitalCorretora
  // que consolida o saldo livre.
  if (diaAberto) {
    // Se há dia aberto, o capital base para novos trades é o "capitalInicialReal" + resultados até o momento
    // (O resultadoDia já é atualizado dinamicamente quando a trade é fechada, 
    // mas se quisermos considerar o capital em tempo real para os % podemos usar apenas capitalInicialReal, 
    // e os cálculos do backend usarão capitalInicialReal anyway).
    // Para simplificar: na conta de LIMITES DO DIA (ex: Stop), a versão original 
    // amarra o cálculo apenas no `capitalInicialReal`. Então vamos enviar isso.
    capitalCorretoraUSD = diaAberto.capitalInicialReal
  } else {
    // Busca banco fechado + depósitos orfãos
    const ultimoDia = await prisma.tradingDay.findFirst({
      where: { userId, isClosed: true },
      orderBy: { date: 'desc' },
    })

    const gtDate = ultimoDia ? ultimoDia.date : undefined
    const movsAnteriores = await prisma.depositoSaque.findMany({
      where: {
        userId,
        conta: 'CORRETORA',
        data: gtDate ? { gt: gtDate } : undefined,
      },
    })

    const netAnteriores = movsAnteriores.reduce(
      (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
      0
    )

    capitalCorretoraUSD = (ultimoDia?.capitalFinal ?? 0) + netAnteriores
  }

  // 2. Capital em Reserva (puramente livro-caixa BRL)
  const movsReserva = await prisma.depositoSaque.findMany({
    where: { userId, conta: 'RESERVA' }
  })

  const saldoReservaBRL = movsReserva.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL),
    0
  )

  // 3. Banca Global (USD)
  const config = await prisma.configuration.findUnique({ where: { userId } })
  const cambio = config?.cambioCompra || 5.0
  const reservaOuroUSD = saldoReservaBRL / cambio
  
  const bancaGlobalUSD = capitalCorretoraUSD + reservaOuroUSD

  return {
    capitalCorretoraUSD,
    saldoReservaBRL,
    cambioConsiderado: cambio,
    bancaGlobalUSD,
  }
}
