import { Request, Response } from 'express'
import * as ativosService from '../services/ativos.service'

export async function listar(req: Request, res: Response) {
  const ativos = await ativosService.listarAtivos(req.user!.userId)
  res.json(ativos)
}

export async function criar(req: Request, res: Response) {
  const ativo = await ativosService.criarAtivo(req.user!.userId, req.body.nome, req.body.payout)
  res.status(201).json(ativo)
}

export async function atualizar(req: Request, res: Response) {
  const ativo = await ativosService.atualizarAtivo(
    String(req.params.id),
    req.user!.userId,
    req.body.ativo,
    req.body.payout
  )
  res.json(ativo)
}

export async function deletar(req: Request, res: Response) {
  await ativosService.deletarAtivo(String(req.params.id), req.user!.userId)
  res.status(204).send()
}

export async function reordenar(req: Request, res: Response) {
  const { ids } = req.body as { ids: string[] }
  await ativosService.reordenarAtivos(req.user!.userId, ids)
  res.status(204).send()
}
