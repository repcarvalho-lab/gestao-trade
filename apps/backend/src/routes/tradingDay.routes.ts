import { Router } from 'express'
import * as tradingDayController from '../controllers/tradingDay.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/aberto', tradingDayController.getDiaAberto)
router.post('/', tradingDayController.criarDia)
router.get('/', tradingDayController.listarDias)
router.get('/:id', tradingDayController.getDia)
router.patch('/:id/deposito', tradingDayController.atualizarDeposito)
router.post('/:id/fechar', tradingDayController.fecharDia)

export default router
