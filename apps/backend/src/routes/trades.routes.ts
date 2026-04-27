import { Router } from 'express'
import * as tradesController from '../controllers/trades.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'

const router = Router()

router.use(authenticate)

router.post('/', catchAsync(tradesController.criarTrade))
router.patch('/:id/resultado', catchAsync(tradesController.marcarResultado))
router.patch('/:id', catchAsync(tradesController.editarTrade))
router.get('/dia/:tradingDayId', catchAsync(tradesController.listarTradesDoDia))
router.delete('/:id', catchAsync(tradesController.excluirTrade))

export default router
