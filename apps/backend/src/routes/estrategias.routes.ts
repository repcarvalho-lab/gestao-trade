import { Router } from 'express'
import * as estrategiasController from '../controllers/estrategias.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'

const router = Router()

router.use(authenticate)

router.get('/', catchAsync(estrategiasController.listarEstrategias))
router.post('/', catchAsync(estrategiasController.criarEstrategia))
router.patch('/:id', catchAsync(estrategiasController.editarEstrategia))
router.delete('/:id', catchAsync(estrategiasController.excluirEstrategia))
router.post('/:id/reativar', catchAsync(estrategiasController.reativarEstrategia))

export default router
