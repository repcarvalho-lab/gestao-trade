import { Request, Response } from 'express'
import { getCapitalStatus } from '../services/capital.service'

export async function consultar(req: Request, res: Response) {
  const status = await getCapitalStatus(req.user!.userId)
  res.json(status)
}
