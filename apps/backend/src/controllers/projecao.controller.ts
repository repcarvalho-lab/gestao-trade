import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { calcularProjecaoAnual } from '../services/dayCalculator'

export async function getProjecao(req: Request, res: Response) {
  const userId = req.user!.userId

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) {
    res.status(404).json({ error: 'Configurações não encontradas' })
    return
  }

  // Capital base = último dia fechado do mês anterior (= capital real no início do mês atual)
  const agora = new Date()
  const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)

  const ultimoDiaMesAnterior = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: true, date: { lt: inicioMesAtual } },
    orderBy: { date: 'desc' },
  })

  // Fallback: se não há histórico anterior, usa o capitalInicialReal do primeiro dia do mês atual
  const primeiroDiaMesAtual = !ultimoDiaMesAnterior
    ? await prisma.tradingDay.findFirst({
        where: { userId, isClosed: true, date: { gte: inicioMesAtual } },
        orderBy: { date: 'asc' },
      })
    : null

  const capitalAtual =
    ultimoDiaMesAnterior?.capitalFinal ??
    primeiroDiaMesAtual?.capitalInicialReal ??
    0

  // Mês de início: mês atual
  const mesInicio = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  // Aportes planejados do banco (merged com query params opcionais)
  const aportesDb = await prisma.aportePlanejado.findMany({ where: { userId } })
  const aportesPorMes: Record<string, number> = {}
  for (const a of aportesDb) {
    aportesPorMes[a.mes] = a.valor
  }
  // Query params sobrescrevem os do banco (para simulações)
  if (req.query.aportes) {
    const override = JSON.parse(req.query.aportes as string)
    Object.assign(aportesPorMes, override)
  }

  const saquesDb = await prisma.saquePlanejado.findMany({ where: { userId } })
  const saquesPorMes: Record<string, number> = {}
  
  // Preenche saques por mês a partir da tabela SaquePlanejado
  for (const s of saquesDb) {
    saquesPorMes[s.mes] = s.valor
  }

  if (req.query.saques) {
    const overrideSaques = JSON.parse(req.query.saques as string)
    Object.assign(saquesPorMes, overrideSaques)
  }

  const projecao = calcularProjecaoAnual({
    capitalAtual,
    config,
    aportesPorMes,
    saquesPorMes,
    mesInicio,
    meses: 12,
  })

  res.json({ capitalAtual, mesInicio, aportesPlanejados: aportesDb, saquesPlanejados: saquesDb, projecao })
}

