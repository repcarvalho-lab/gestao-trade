import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function listarAtivos(userId: string) {
  return prisma.ativo.findMany({
    where: { userId },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
  })
}

export async function reordenarAtivos(userId: string, ids: string[]) {
  await Promise.all(
    ids.map((id, index) =>
      prisma.ativo.updateMany({ where: { id, userId }, data: { ordem: index } })
    )
  )
}

export async function criarAtivo(userId: string, nome: string, payout?: number) {
  // Ignora nome vazio
  if (!nome || !nome.trim()) {
    throw new AppError('Nome do ativo é obrigatório.', 400)
  }

  const nomeFormatado = nome.trim().toUpperCase()

  const existe = await prisma.ativo.findUnique({
    where: {
      userId_nome: { userId, nome: nomeFormatado },
    },
  })

  if (existe) {
    throw new AppError('Você já possui um ativo com esse nome.', 409)
  }

  return prisma.ativo.create({
    data: {
      userId,
      nome: nomeFormatado,
      payout: payout ?? 0.85,
    },
  })
}

export async function atualizarAtivo(id: string, userId: string, ativoFlag?: boolean, payout?: number) {
  const ativo = await prisma.ativo.findFirst({ where: { id, userId } })
  if (!ativo) throw new AppError('Ativo não encontrado.', 404)

  const dataToUpdate: any = {}
  if (ativoFlag !== undefined) dataToUpdate.ativo = ativoFlag
  if (payout !== undefined) dataToUpdate.payout = payout

  return prisma.ativo.update({
    where: { id },
    data: dataToUpdate,
  })
}

export async function deletarAtivo(id: string, userId: string) {
  const ativo = await prisma.ativo.findFirst({ where: { id, userId } })
  if (!ativo) throw new AppError('Ativo não encontrado.', 404)

  await prisma.ativo.delete({ where: { id } })
}
