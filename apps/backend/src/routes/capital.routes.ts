import { Router } from 'express'
import * as capitalController from '../controllers/capital.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'

const router = Router()

router.use(authenticate)
router.get('/', catchAsync(capitalController.consultar))

export default router
