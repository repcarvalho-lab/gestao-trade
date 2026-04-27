import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listarErros(userId: string) {
  return prisma.erroDia.findMany({
    where: { userId },
    orderBy: { nome: 'asc' },
  })
}

export async function criarErro(userId: string, nome: string, gravidade: 'LEVE' | 'GRAVE' = 'GRAVE') {
  return prisma.erroDia.create({
    data: { userId, nome, gravidade },
  })
}

export async function atualizarErro(id: string, userId: string, nome: string, gravidade: 'LEVE' | 'GRAVE') {
  const erro = await prisma.erroDia.findFirst({ where: { id, userId } })
  if (!erro) throw new AppError('Erro não encontrado', 404)
  return prisma.erroDia.update({ where: { id }, data: { nome, gravidade } })
}

export async function deletarErro(id: string, userId: string) {
  const erro = await prisma.erroDia.findFirst({ where: { id, userId } })
  if (!erro) throw new AppError('Erro não encontrado', 404)
  await prisma.erroDia.delete({ where: { id } })
}
