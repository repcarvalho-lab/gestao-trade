import { Router } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { authenticate } from '../middleware/auth'
import * as ativosController from '../controllers/ativos.controller'

const router = Router()

router.use(authenticate)

router.get('/',        catchAsync(ativosController.listar))
router.post('/',       catchAsync(ativosController.criar))
router.put('/ordem',   catchAsync(ativosController.reordenar))
router.patch('/:id',   catchAsync(ativosController.atualizar))
router.delete('/:id',  catchAsync(ativosController.deletar))

export default router
