import { Router } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { authenticate } from '../middleware/auth'
import * as saquesController from '../controllers/saques.controller'

const router = Router()
router.use(authenticate)

router.get('/',       catchAsync(saquesController.listar))
router.post('/',      catchAsync(saquesController.criar))
router.patch('/:id',  catchAsync(saquesController.atualizar))
router.delete('/:id', catchAsync(saquesController.deletar))

export default router
