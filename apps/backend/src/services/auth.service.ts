import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { AppError } from '../middleware/errorHandler'

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
  path: '/api/auth/refresh',
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
    user: { id: user.id, email: user.email, role: user.role },
  }
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
