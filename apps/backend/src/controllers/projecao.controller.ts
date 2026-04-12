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

  // Aportes e saques por mês (query params opcionais)
  const aportesPorMesParam = req.query.aportes
    ? JSON.parse(req.query.aportes as string)
    : {}
  const saquesPorMesParam = req.query.saques
    ? JSON.parse(req.query.saques as string)
    : {}

  // Aplica aporte configurado se não informado manualmente
  if (config.aporteValor && config.aporteMes) {
    aportesPorMesParam[config.aporteMes] =
      aportesPorMesParam[config.aporteMes] ?? config.aporteValor
  }

  const projecao = calcularProjecaoAnual({
    capitalAtual,
    config,
    aportesPorMes: aportesPorMesParam,
    saquesPorMes: saquesPorMesParam,
    mesInicio,
    meses: 12,
  })

  res.json({ capitalAtual, mesInicio, projecao })
}
