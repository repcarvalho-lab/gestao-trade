import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/dump', async (req, res) => {
  try {
    const users = await prisma.user.findMany()
    const userId = users[0].id
    const config = await prisma.configuration.findUnique({ where: { userId } })
    const dias = await prisma.tradingDay.findMany({ where: { userId }, orderBy: { date: 'asc' } })
    const movs = await prisma.depositoSaque.findMany({ where: { userId }, orderBy: { data: 'asc' } })
    res.json({ config, dias, movs })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export const backdoorRoutes = router
