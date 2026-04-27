import { Request, Response } from 'express'
import * as erroDiaService from '../services/erroDia.service'

export async function listar(req: Request, res: Response) {
  const erros = await erroDiaService.listarErros(req.user!.userId)
  res.json(erros)
}

export async function criar(req: Request, res: Response) {
  const erro = await erroDiaService.criarErro(req.user!.userId, req.body.nome, req.body.gravidade)
  res.status(201).json(erro)
}

export async function atualizar(req: Request, res: Response) {
  const erro = await erroDiaService.atualizarErro(
    String(req.params.id),
    req.user!.userId,
    req.body.nome,
    req.body.gravidade,
  )
  res.json(erro)
}

export async function deletar(req: Request, res: Response) {
  await erroDiaService.deletarErro(String(req.params.id), req.user!.userId)
  res.status(204).send()
}
