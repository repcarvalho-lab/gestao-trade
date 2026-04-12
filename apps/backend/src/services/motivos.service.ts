import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listarMotivos(userId: string, apenasAtivos = true) {
  return prisma.motivoEntrada.findMany({
    where: { userId, ...(apenasAtivos ? { ativo: true } : {}) },
    orderBy: { nome: 'asc' },
  })
}

export async function criarMotivo(userId: string, nome: string) {
  return prisma.motivoEntrada.create({ data: { userId, nome } })
}

export async function atualizarMotivo(id: string, userId: string, nome: string) {
  const motivo = await prisma.motivoEntrada.findFirst({ where: { id, userId } })
  if (!motivo) throw new AppError('Motivo não encontrado', 404)
  return prisma.motivoEntrada.update({ where: { id }, data: { nome } })
}

export async function desativarMotivo(id: string, userId: string) {
  const motivo = await prisma.motivoEntrada.findFirst({ where: { id, userId } })
  if (!motivo) throw new AppError('Motivo não encontrado', 404)
  return prisma.motivoEntrada.update({ where: { id }, data: { ativo: false } })
}

export async function reativarMotivo(id: string, userId: string) {
  const motivo = await prisma.motivoEntrada.findFirst({ where: { id, userId } })
  if (!motivo) throw new AppError('Motivo não encontrado', 404)
  return prisma.motivoEntrada.update({ where: { id }, data: { ativo: true } })
}
