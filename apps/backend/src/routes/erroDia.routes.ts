import { Router } from 'express'
import * as erroDiaController from '../controllers/erroDia.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'

const router = Router()

router.use(authenticate)

router.get('/', catchAsync(erroDiaController.listar))
router.post('/', catchAsync(erroDiaController.criar))
router.patch('/:id', catchAsync(erroDiaController.atualizar))
router.delete('/:id', catchAsync(erroDiaController.deletar))

export default router
