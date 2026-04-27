import { Request, Response } from 'express'
import * as tradingDayService from '../services/tradingDay.service'

export async function getDiaAberto(req: Request, res: Response) {
  const dia = await tradingDayService.getDiaComIndicadores(req.user!.userId)
  if (!dia) {
    res.status(404).json({ message: 'Nenhum dia em aberto' })
    return
  }
  res.json(dia)
}

export async function criarDia(req: Request, res: Response) {
  const dia = await tradingDayService.criarDia(
    req.user!.userId,
    req.body.capitalInicial,
    req.body.data,         // "YYYY-MM-DD" — opcional
  )
  res.status(201).json(dia)
}

export async function atualizarDeposito(req: Request, res: Response) {
  const dia = await tradingDayService.atualizarDeposito(
    String(req.params.id),
    req.user!.userId,
    req.body.deposito,
  )
  res.json(dia)
}

export async function fecharDia(req: Request, res: Response) {
  const dia = await tradingDayService.fecharDia(
    String(req.params.id),
    req.user!.userId,
    req.body.emocional,
    req.body.seguiuSetup,
    req.body.errosDia ?? [],
  )
  res.json(dia)
}

export async function listarDias(req: Request, res: Response) {
  const dias = await tradingDayService.listarDias(req.user!.userId)
  res.json(dias)
}

export async function getDia(req: Request, res: Response) {
  const dia = await tradingDayService.getDia(String(req.params.id), req.user!.userId)
  res.json(dia)
}

export async function reabrirDia(req: Request, res: Response) {
  const dia = await tradingDayService.reabrirDia(String(req.params.id), req.user!.userId)
  res.json(dia)
}

export async function excluirDia(req: Request, res: Response) {
  await tradingDayService.excluirDia(String(req.params.id), req.user!.userId)
  res.status(204).send()
}
