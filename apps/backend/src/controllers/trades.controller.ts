import { Request, Response } from 'express'
import * as tradesService from '../services/trades.service'

export async function criarTrade(req: Request, res: Response) {
  const trade = await tradesService.criarTrade({
    userId: req.user!.userId,
    ...req.body,
  })
  res.status(201).json(trade)
}

export async function marcarResultado(req: Request, res: Response) {
  const trade = await tradesService.marcarResultado(
    String(req.params.id),
    req.user!.userId,
    req.body.resultado,
  )
  res.json(trade)
}

export async function listarTradesDoDia(req: Request, res: Response) {
  const trades = await tradesService.listarTradesDoDia(
    String(req.params.tradingDayId),
    req.user!.userId,
  )
  res.json(trades)
}
