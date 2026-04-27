import { prisma } from '../lib/prisma'

export async function getPlanejadoRealizado(userId: string) {
  const meses = await prisma.monthlyReport.findMany({
    where: { userId },
    orderBy: { mes: 'asc' },
  })

  const config = await prisma.configuration.findUnique({ where: { userId } })

  // Capital inicial do mês corrente (primeiro dia do mês atual, ou primeiro dia aberto)
  const agora = new Date()
  const inicioMesAtual = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1))
  const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  // Só adiciona ponto do mês atual se ele ainda não está nos relatórios fechados
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

  const movimentos = await prisma.depositoSaque.groupBy({
    by: ['mes', 'tipo'],
    where: { userId },
    _sum: { valorUSD: true },
  })

  const movMap: Record<string, { aporte: number; saque: number }> = {}
  for (const m of movimentos) {
    if (!movMap[m.mes]) movMap[m.mes] = { aporte: 0, saque: 0 }
    if (m.tipo === 'DEPOSITO') movMap[m.mes].aporte += m._sum.valorUSD || 0
    if (m.tipo === 'SAQUE') movMap[m.mes].saque += m._sum.valorUSD || 0
  }

  const mesesComMov = meses.map(m => ({
    ...m,
    aporteReal: movMap[m.mes]?.aporte || 0,
    saqueReal: movMap[m.mes]?.saque || 0,
  }))

  let mesAtualComMov = null
  if (mesAtual) {
    mesAtualComMov = {
      ...mesAtual,
      aporteReal: movMap[mesAtual.mes]?.aporte || 0,
      saqueReal: movMap[mesAtual.mes]?.saque || 0,
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
