import { Router } from 'express'
import * as dashboardController from '../controllers/dashboard.controller'
import * as relatoriosController from '../controllers/relatorios.controller'
import * as projecaoController from '../controllers/projecao.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/dashboard', dashboardController.getDashboard)
router.get('/relatorios/semanal', relatoriosController.getSemanal)
router.get('/relatorios/mensal', relatoriosController.getMensal)
router.get('/projecao', projecaoController.getProjecao)

export default router
