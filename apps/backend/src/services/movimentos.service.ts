import { MovimentoTipo } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

interface CriarMovimentoInput {
  userId: string
  data: Date
  tipo: MovimentoTipo
  valorUSD: number
  cambio: number
  observacao?: string
  faixaPlanejada?: string
}

export async function criarMovimento(input: CriarMovimentoInput) {
  const { data, tipo, valorUSD, cambio } = input
  const valorBRL = valorUSD * cambio
  const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`

  return prisma.depositoSaque.create({
    data: {
      ...input,
      valorBRL,
      mes,
    },
  })
}

export async function listarMovimentos(userId: string) {
  return prisma.depositoSaque.findMany({
    where: { userId },
    orderBy: { data: 'desc' },
  })
}

export async function atualizarMovimento(
  id: string,
  userId: string,
  data: Partial<CriarMovimentoInput>,
) {
  const mov = await prisma.depositoSaque.findFirst({ where: { id, userId } })
  if (!mov) throw new AppError('Movimentação não encontrada', 404)

  const valorBRL = data.valorUSD && data.cambio ? data.valorUSD * data.cambio : undefined
  return prisma.depositoSaque.update({
    where: { id },
    data: { ...data, ...(valorBRL ? { valorBRL } : {}) },
  })
}

export async function deletarMovimento(id: string, userId: string) {
  const mov = await prisma.depositoSaque.findFirst({ where: { id, userId } })
  if (!mov) throw new AppError('Movimentação não encontrada', 404)
  return prisma.depositoSaque.delete({ where: { id } })
}
