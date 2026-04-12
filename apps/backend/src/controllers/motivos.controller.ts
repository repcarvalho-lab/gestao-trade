import { Request, Response } from 'express'
import * as motivosService from '../services/motivos.service'

export async function listar(req: Request, res: Response) {
  const todos = req.query.todos === 'true'
  const motivos = await motivosService.listarMotivos(req.user!.userId, !todos)
  res.json(motivos)
}

export async function criar(req: Request, res: Response) {
  const motivo = await motivosService.criarMotivo(req.user!.userId, req.body.nome)
  res.status(201).json(motivo)
}

export async function atualizar(req: Request, res: Response) {
  const motivo = await motivosService.atualizarMotivo(
    String(req.params.id),
    req.user!.userId,
    req.body.nome,
  )
  res.json(motivo)
}

export async function desativar(req: Request, res: Response) {
  await motivosService.desativarMotivo(String(req.params.id), req.user!.userId)
  res.status(204).send()
}

export async function reativar(req: Request, res: Response) {
  const motivo = await motivosService.reativarMotivo(String(req.params.id), req.user!.userId)
  res.json(motivo)
}
