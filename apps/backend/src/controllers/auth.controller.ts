import { Request, Response } from 'express'
import * as authService from '../services/auth.service'

export async function login(req: Request, res: Response) {
  const { email, password } = req.body
  const result = await authService.login(email, password)
  res
    .cookie('refreshToken', result.refreshToken, result.cookieOptions)
    .json({ accessToken: result.accessToken, user: result.user })
}

export async function register(req: Request, res: Response) {
  const { nome, email, password } = req.body
  const result = await authService.register(nome, email, password)
  res
    .cookie('refreshToken', result.refreshToken, result.cookieOptions)
    .json({ accessToken: result.accessToken, user: result.user })
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refreshToken
  if (!token) {
    res.status(401).json({ error: 'Refresh token ausente' })
    return
  }
  const result = await authService.refreshAccessToken(token)
  res
    .cookie('refreshToken', result.refreshToken, result.cookieOptions)
    .json({ accessToken: result.accessToken })
}

export async function logout(_req: Request, res: Response) {
  const { cookieOptions } = authService.logout()
  res.cookie('refreshToken', '', cookieOptions).json({ message: 'Logout realizado com sucesso' })
}

export function me(req: Request, res: Response) {
  res.json({ user: req.user })
}

export async function updateProfile(req: Request, res: Response) {
  const { nome, email } = req.body
  const updatedUser = await authService.updateProfile((req.user as any).userId, { nome, email })
  res.json({ user: updatedUser })
}
