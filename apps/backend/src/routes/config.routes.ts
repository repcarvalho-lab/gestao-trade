import { Router } from 'express'
import * as configController from '../controllers/config.controller'
import { authenticate, requireAdmin } from '../middleware/auth'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/', configController.getConfig)
router.patch('/', configController.updateConfig)

export default router
