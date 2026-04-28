import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listarAportes(userId: string) {
  return prisma.aportePlanejado.findMany({
    where: { userId },
    orderBy: { mes: 'asc' },
  })
}

export async function criarAporte(userId: string, mes: string, valor: number, dia: number = 1) {
  // Verifica duplicata
  const existe = await prisma.aportePlanejado.findUnique({
    where: { userId_mes: { userId, mes } },
  })
  if (existe) throw new AppError(`Já existe um aporte planejado para ${mes}.`, 409)

  return prisma.aportePlanejado.create({
    data: { userId, mes, valor, dia },
  })
}

export async function atualizarAporte(id: string, userId: string, valor?: number, dia?: number) {
  const aporte = await prisma.aportePlanejado.findFirst({ where: { id, userId } })
  if (!aporte) throw new AppError('Aporte não encontrado.', 404)

  return prisma.aportePlanejado.update({
    where: { id },
    data: { 
      ...(valor !== undefined && { valor }),
      ...(dia !== undefined && { dia })
    },
  })
}

export async function deletarAporte(id: string, userId: string) {
  const aporte = await prisma.aportePlanejado.findFirst({ where: { id, userId } })
  if (!aporte) throw new AppError('Aporte não encontrado.', 404)

  await prisma.aportePlanejado.delete({ where: { id } })
}
