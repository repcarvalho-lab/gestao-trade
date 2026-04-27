import { Request, Response } from 'express'
import * as movimentosService from '../services/movimentos.service'

export async function criar(req: Request, res: Response) {
  const mov = await movimentosService.criarMovimento({
    userId: req.user!.userId,
    ...req.body,
    data: new Date(req.body.data),
  })
  res.status(201).json(mov)
}

export async function listar(req: Request, res: Response) {
  const data = typeof req.query.data === 'string' ? req.query.data : undefined
  const movimentos = await movimentosService.listarMovimentos(req.user!.userId, data)
  res.json(movimentos)
}

export async function atualizar(req: Request, res: Response) {
  const mov = await movimentosService.atualizarMovimento(
    String(req.params.id),
    req.user!.userId,
    req.body,
  )
  res.json(mov)
}

export async function deletar(req: Request, res: Response) {
  await movimentosService.deletarMovimento(String(req.params.id), req.user!.userId)
  res.status(204).send()
}
