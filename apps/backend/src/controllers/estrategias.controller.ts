import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listarEstrategias(req: Request, res: Response) {
  const { todos } = req.query
  const estrategias = await prisma.estrategia.findMany({
    where: { 
      userId: req.user!.userId,
      ...(todos !== 'true' ? { ativo: true } : {})
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(estrategias)
}

export async function criarEstrategia(req: Request, res: Response) {
  const { nome } = req.body
  if (!nome) throw new AppError('Nome da estratégia é obrigatório', 400)

  const existente = await prisma.estrategia.findUnique({
    where: { userId_nome: { userId: req.user!.userId, nome } }
  })
  if (existente) throw new AppError('Estratégia já existe', 400)

  const estrategia = await prisma.estrategia.create({
    data: { userId: req.user!.userId, nome }
  })
  res.status(201).json(estrategia)
}

export async function editarEstrategia(req: Request, res: Response) {
  const { nome } = req.body
  const estrategia = await prisma.estrategia.findFirst({
    where: { id: req.params.id as string, userId: req.user!.userId }
  })
  if (!estrategia) throw new AppError('Estratégia não encontrada', 404)

  const estrategiaAtualizado = await prisma.estrategia.update({
    where: { id: req.params.id as string },
    data: { nome }
  })
  res.json(estrategiaAtualizado)
}

export async function excluirEstrategia(req: Request, res: Response) {
  const estrategia = await prisma.estrategia.findFirst({
    where: { id: req.params.id as string, userId: req.user!.userId }
  })
  if (!estrategia) throw new AppError('Estratégia não encontrada', 404)

  await prisma.estrategia.update({
    where: { id: req.params.id as string },
    data: { ativo: false }
  })
  res.status(204).send()
}

export async function reativarEstrategia(req: Request, res: Response) {
  const estrategia = await prisma.estrategia.findFirst({
    where: { id: req.params.id as string, userId: req.user!.userId }
  })
  if (!estrategia) throw new AppError('Estratégia não encontrada', 404)

  const estrategiaAtualizado = await prisma.estrategia.update({
    where: { id: req.params.id as string },
    data: { ativo: true }
  })
  res.json(estrategiaAtualizado)
}
