import { Request, Response } from 'express'
import * as configService from '../services/config.service'

export async function getConfig(req: Request, res: Response) {
  const config = await configService.getConfig(req.user!.userId)
  res.json(config)
}

export async function updateConfig(req: Request, res: Response) {
  const config = await configService.updateConfig(req.user!.userId, req.body)
  res.json(config)
}
