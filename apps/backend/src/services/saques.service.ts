import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listarSaques(userId: string) {
  return prisma.saquePlanejado.findMany({
    where: { userId },
    orderBy: { mes: 'asc' },
  })
}

export async function criarSaque(userId: string, mes: string, valor: number, dia: number = 1) {
  const existe = await prisma.saquePlanejado.findUnique({
    where: { userId_mes: { userId, mes } },
  })
  if (existe) throw new AppError(`Já existe um saque planejado para ${mes}.`, 409)

  return prisma.saquePlanejado.create({
    data: { userId, mes, valor, dia },
  })
}

export async function atualizarSaque(id: string, userId: string, valor?: number, dia?: number) {
  const saque = await prisma.saquePlanejado.findFirst({ where: { id, userId } })
  if (!saque) throw new AppError('Saque não encontrado.', 404)

  return prisma.saquePlanejado.update({
    where: { id },
    data: {
      ...(valor !== undefined && { valor }),
      ...(dia !== undefined && { dia })
    },
  })
}

export async function deletarSaque(id: string, userId: string) {
  const saque = await prisma.saquePlanejado.findFirst({ where: { id, userId } })
  if (!saque) throw new AppError('Saque não encontrado.', 404)

  await prisma.saquePlanejado.delete({ where: { id } })
}
