import { Request, Response } from 'express'
import * as dashboardService from '../services/dashboard.service'
import * as planejadoService from '../services/planejadoRealizado.service'

export async function getDashboard(req: Request, res: Response) {
  const data = await dashboardService.getDashboard(req.user!.userId)
  res.json(data)
}

export async function getPlanejadoRealizado(req: Request, res: Response) {
  const data = await planejadoService.getPlanejadoRealizado(req.user!.userId)
  res.json(data)
}
