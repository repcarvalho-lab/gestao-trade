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

  // Capital atual: último dia fechado ou 0
  const ultimoDia = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: true },
    orderBy: { date: 'desc' },
  })
  const capitalAtual = ultimoDia?.capitalFinal ?? 0

  // Mês de início: mês atual
  const agora = new Date()
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

  const saquesPorMes: Record<string, number> = req.query.saques
    ? JSON.parse(req.query.saques as string)
    : {}

  const projecao = calcularProjecaoAnual({
    capitalAtual,
    config,
    aportesPorMes,
    saquesPorMes,
    mesInicio,
    meses: 12,
  })

  res.json({ capitalAtual, mesInicio, aportesPlanejados: aportesDb, projecao })
}

