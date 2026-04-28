import { Request, Response } from 'express'
import * as saquesService from '../services/saques.service'

export async function listar(req: Request, res: Response) {
  const saques = await saquesService.listarSaques(req.user!.userId)
  res.json(saques)
}

export async function criar(req: Request, res: Response) {
  const saque = await saquesService.criarSaque(
    req.user!.userId,
    req.body.mes,
    Number(req.body.valor),
    req.body.dia !== undefined ? Number(req.body.dia) : undefined,
  )
  res.status(201).json(saque)
}

export async function atualizar(req: Request, res: Response) {
  const saque = await saquesService.atualizarSaque(
    String(req.params.id),
    req.user!.userId,
    req.body.valor !== undefined ? Number(req.body.valor) : undefined,
    req.body.dia !== undefined ? Number(req.body.dia) : undefined,
  )
  res.json(saque)
}

export async function deletar(req: Request, res: Response) {
  await saquesService.deletarSaque(String(req.params.id), req.user!.userId)
  res.status(204).send()
}
