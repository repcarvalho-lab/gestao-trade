import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export async function getConfig(userId: string) {
  let config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) {
    config = await prisma.configuration.create({
      data: {
        userId,
        metaIdealPct: 0.05,
        metaMaximaPct: 0.10,
        stopDiarioPct: 0.02,
        riscoMaxCicloPct: 0.02,
        pctSugeridaEntrada: 0.02,
        maxEntradasPorCiclo: 3,
        maxCiclosPorDia: 2,
      }
    })
  }
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
