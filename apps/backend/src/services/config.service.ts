import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function getConfig(userId: string) {
  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 404)
  return config
}

export async function updateConfig(userId: string, data: Record<string, unknown>) {
  const config = await prisma.configuration.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })
  return config
}
