import { Router } from 'express'
import * as tradesController from '../controllers/trades.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.post('/', tradesController.criarTrade)
router.patch('/:id/resultado', tradesController.marcarResultado)
router.get('/dia/:tradingDayId', tradesController.listarTradesDoDia)

export default router
