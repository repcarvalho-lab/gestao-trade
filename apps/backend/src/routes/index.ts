import { Router } from 'express'
import authRoutes from './auth.routes'
import configRoutes from './config.routes'
import motivosRoutes from './motivos.routes'
import tradingDayRoutes from './tradingDay.routes'
import tradesRoutes from './trades.routes'
import movimentosRoutes from './movimentos.routes'
import analyticsRoutes from './analytics.routes'

export const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

router.use('/auth', authRoutes)
router.use('/config', configRoutes)
router.use('/motivos', motivosRoutes)
router.use('/trading-days', tradingDayRoutes)
router.use('/trades', tradesRoutes)
router.use('/movimentos', movimentosRoutes)
router.use('/', analyticsRoutes)
