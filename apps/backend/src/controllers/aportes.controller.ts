import { Request, Response } from 'express'
import * as aportesService from '../services/aportes.service'

export async function listar(req: Request, res: Response) {
  const aportes = await aportesService.listarAportes(req.user!.userId)
  res.json(aportes)
}

export async function criar(req: Request, res: Response) {
  const aporte = await aportesService.criarAporte(
    req.user!.userId,
    req.body.mes,
    Number(req.body.valor),
    req.body.dia !== undefined ? Number(req.body.dia) : undefined,
  )
  res.status(201).json(aporte)
}

export async function atualizar(req: Request, res: Response) {
  const aporte = await aportesService.atualizarAporte(
    String(req.params.id),
    req.user!.userId,
    req.body.valor !== undefined ? Number(req.body.valor) : undefined,
    req.body.dia !== undefined ? Number(req.body.dia) : undefined,
  )
  res.json(aporte)
}

export async function deletar(req: Request, res: Response) {
  await aportesService.deletarAporte(String(req.params.id), req.user!.userId)
  res.status(204).send()
}
