import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { AppError } from '../middleware/errorHandler'
import { sendWelcomeEmail } from './email.service'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
  path: '/api/auth/refresh',
}

export async function register(nome: string, email: string, passwordPlain: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) throw new AppError('Este e-mail já está em uso.', 409)

  const passwordHash = await bcrypt.hash(passwordPlain, 10)
  
  const user = await prisma.user.create({
    data: {
      nome,
      email,
      passwordHash,
      configuration: {
        create: {
          metaIdealPct: 0.05,
          metaMaximaPct: 0.10,
          stopDiarioPct: 0.02,
          riscoMaxCicloPct: 0.02,
          pctSugeridaEntrada: 0.02,
          maxEntradasPorCiclo: 3,
          maxCiclosPorDia: 2,
        }
      }
    }
  })

  const payload = { userId: user.id, role: user.role, email: user.email }
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  // Envia email de forma assíncrona (sem travar o retorno)
  sendWelcomeEmail(user.email, user.nome).catch(err => console.error(err))

  return {
    accessToken,
    refreshToken,
    cookieOptions: REFRESH_COOKIE_OPTIONS,
    user: { id: user.id, email: user.email, role: user.role, nome: user.nome },
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new AppError('Credenciais inválidas', 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError('Credenciais inválidas', 401)

  const payload = { userId: user.id, role: user.role, email: user.email }
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  return {
    accessToken,
    refreshToken,
    cookieOptions: REFRESH_COOKIE_OPTIONS,
    user: { id: user.id, email: user.email, role: user.role, nome: user.nome },
  }
}

export async function updateProfile(userId: string, data: { nome?: string; email?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { nome: data.nome, email: data.email }
  })
  return { id: user.id, email: user.email, role: user.role, nome: user.nome }
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) throw new AppError('Usuário não encontrado', 401)

    const newPayload = { userId: user.id, role: user.role, email: user.email }
    const accessToken = generateAccessToken(newPayload)
    const newRefreshToken = generateRefreshToken(newPayload)

    return {
      accessToken,
      refreshToken: newRefreshToken,
      cookieOptions: REFRESH_COOKIE_OPTIONS,
    }
  } catch {
    throw new AppError('Refresh token inválido', 401)
  }
}

export function logout() {
  return {
    cookieOptions: { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 },
  }
}
