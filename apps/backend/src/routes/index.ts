import { Router } from 'express'
import authRoutes from './auth.routes'
import configRoutes from './config.routes'
import motivosRoutes from './motivos.routes'
import ativosRoutes from './ativos.routes'
import tradingDayRoutes from './tradingDay.routes'
import tradesRoutes from './trades.routes'
import movimentosRoutes from './movimentos.routes'
import analyticsRoutes from './analytics.routes'
import aportesRoutes from './aportes.routes'
import saquesRoutes from './saques.routes'
import erroDiaRoutes from './erroDia.routes'
import relatoriosRoutes from './relatorios.routes'
import capitalRoutes from './capital.routes'

export const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

router.use('/auth', authRoutes)
router.use('/config', configRoutes)
router.use('/motivos', motivosRoutes)
router.use('/ativos', ativosRoutes)
router.use('/trading-days', tradingDayRoutes)
router.use('/trades', tradesRoutes)
router.use('/movimentos', movimentosRoutes)
router.use('/aportes', aportesRoutes)
router.use('/saques', saquesRoutes)
router.use('/erros-dia', erroDiaRoutes)
router.use('/relatorios', relatoriosRoutes)
router.use('/capital', capitalRoutes)
router.use('/', analyticsRoutes)
