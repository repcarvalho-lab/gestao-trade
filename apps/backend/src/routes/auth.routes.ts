import { Router } from 'express'
import { catchAsync } from '../utils/catchAsync'
import { z } from 'zod'
import * as authController from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

router.post('/login', validate(loginSchema), catchAsync(authController.login))
router.post('/register', validate(registerSchema), catchAsync(authController.register))
router.post('/refresh', catchAsync(authController.refresh))
router.post('/logout', catchAsync(authController.logout))
router.get('/me', authenticate, authController.me) // me is sync
router.put('/profile', authenticate, catchAsync(authController.updateProfile))

export default router
