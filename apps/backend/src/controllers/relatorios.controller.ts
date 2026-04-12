import { Request, Response } from 'express'
import * as relatoriosService from '../services/relatorios.service'

export async function getSemanal(req: Request, res: Response) {
  const relatorios = await relatoriosService.getRelatoriosSemanal(req.user!.userId)
  res.json(relatorios)
}

export async function getMensal(req: Request, res: Response) {
  const relatorios = await relatoriosService.getRelatoriosMensal(req.user!.userId)
  res.json(relatorios)
}
