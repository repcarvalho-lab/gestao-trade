import { Router } from 'express'
import { catchAsync } from '../utils/catchAsync'
import * as dashboardController from '../controllers/dashboard.controller'
import * as relatoriosController from '../controllers/relatorios.controller'
import * as projecaoController from '../controllers/projecao.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/dashboard', catchAsync(dashboardController.getDashboard))
router.get('/relatorios/semanal', catchAsync(relatoriosController.getSemanal))
router.get('/relatorios/mensal', catchAsync(relatoriosController.getMensal))
router.get('/projecao', catchAsync(projecaoController.getProjecao))
router.get('/planejado-realizado', catchAsync(dashboardController.getPlanejadoRealizado))

export default router
