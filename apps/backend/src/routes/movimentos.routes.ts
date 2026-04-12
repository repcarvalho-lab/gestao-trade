import { Router } from 'express'
import * as movimentosController from '../controllers/movimentos.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', movimentosController.listar)
router.post('/', movimentosController.criar)
router.patch('/:id', movimentosController.atualizar)
router.delete('/:id', movimentosController.deletar)

export default router
