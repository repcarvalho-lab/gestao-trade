import { Router } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { authenticate } from '../middleware/auth'
import * as aportesController from '../controllers/aportes.controller'

const router = Router()
router.use(authenticate)

router.get('/',       catchAsync(aportesController.listar))
router.post('/',      catchAsync(aportesController.criar))
router.patch('/:id',  catchAsync(aportesController.atualizar))
router.delete('/:id', catchAsync(aportesController.deletar))

export default router
