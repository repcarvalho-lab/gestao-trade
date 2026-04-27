import { Router } from 'express'
import * as movimentosController from '../controllers/movimentos.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'

const router = Router()

router.use(authenticate)

router.get('/', catchAsync(movimentosController.listar))
router.post('/', catchAsync(movimentosController.criar))
router.patch('/:id', catchAsync(movimentosController.atualizar))
router.delete('/:id', catchAsync(movimentosController.deletar))

export default router
