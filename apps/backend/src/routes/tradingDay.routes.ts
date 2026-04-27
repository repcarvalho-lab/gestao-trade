import { Router } from 'express'
import * as tradingDayController from '../controllers/tradingDay.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'

const router = Router()

router.use(authenticate)

router.get('/aberto', catchAsync(tradingDayController.getDiaAberto))
router.post('/', catchAsync(tradingDayController.criarDia))
router.get('/', catchAsync(tradingDayController.listarDias))
router.get('/:id', catchAsync(tradingDayController.getDia))
router.patch('/:id/deposito', catchAsync(tradingDayController.atualizarDeposito))
router.post('/:id/fechar', catchAsync(tradingDayController.fecharDia))
router.post('/:id/reabrir', catchAsync(tradingDayController.reabrirDia))
router.delete('/:id', catchAsync(tradingDayController.excluirDia))

export default router
