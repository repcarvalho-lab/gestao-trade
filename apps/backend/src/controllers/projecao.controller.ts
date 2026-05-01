import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { calcularProjecaoAnual } from '../services/dayCalculator'

import { getCapitalStatus } from '../services/capital.service'

export async function getProjecao(req: Request, res: Response) {
  const userId = req.user!.userId

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) {
    res.status(404).json({ error: 'Configurações não encontradas' })
    return
  }

  const { bancaGlobalUSD } = await getCapitalStatus(userId)
  const capitalAtual = bancaGlobalUSD




  // Mês de início: mês atual
  const agora = new Date()
  const mesInicio = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  // Aportes planejados do banco (merged com query params opcionais)
  const aportesDb = await prisma.aportePlanejado.findMany({ where: { userId } })
  const aportesPorMes: Record<string, { valor: number; dia: number }> = {}
  for (const a of aportesDb) {
    aportesPorMes[a.mes] = { valor: a.valor, dia: a.dia }
  }
  // Query params sobrescrevem os do banco (para simulações)
  if (req.query.aportes) {
    const override = JSON.parse(req.query.aportes as string)
    for (const mes in override) {
      aportesPorMes[mes] = { valor: override[mes], dia: 1 } // Simulacoes simplificadas assumem dia 1
    }
  }

  const saquesDb = await prisma.saquePlanejado.findMany({ where: { userId } })
  const saquesPorMes: Record<string, { valor: number; dia: number }> = {}
  
  // Preenche saques por mês a partir da tabela SaquePlanejado
  for (const s of saquesDb) {
    saquesPorMes[s.mes] = { valor: s.valor, dia: s.dia }
  }

  if (req.query.saques) {
    const overrideSaques = JSON.parse(req.query.saques as string)
    for (const mes in overrideSaques) {
      saquesPorMes[mes] = { valor: overrideSaques[mes], dia: 1 }
    }
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

