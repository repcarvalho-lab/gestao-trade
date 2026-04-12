import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as aportesController from '../controllers/aportes.controller'

const router = Router()
router.use(authenticate)

router.get('/',       aportesController.listar)
router.post('/',      aportesController.criar)
router.patch('/:id',  aportesController.atualizar)
router.delete('/:id', aportesController.deletar)

export default router
