import { Request, Response } from 'express'
import * as dashboardService from '../services/dashboard.service'

export async function getDashboard(req: Request, res: Response) {
  const data = await dashboardService.getDashboard(req.user!.userId)
  res.json(data)
}
