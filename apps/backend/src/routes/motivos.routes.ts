import { Router } from 'express'
import { catchAsync } from '../utils/catchAsync'
import * as motivosController from '../controllers/motivos.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)
router.get('/', motivosController.listar)
router.post('/', motivosController.criar)
router.patch('/:id', motivosController.atualizar)
router.delete('/:id', motivosController.desativar)
router.post('/:id/reativar', motivosController.reativar)

export default router
