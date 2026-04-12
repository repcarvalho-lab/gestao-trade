import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Erros do Prisma
  if (err.constructor.name.startsWith('Prisma')) {
    const prismaErr = err as any
    if (prismaErr.code === 'P2002') {
      res.status(409).json({ error: 'Registro duplicado' })
      return
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ error: 'Registro não encontrado' })
      return
    }
  }

  console.error('❌ Erro não tratado:', err)
  res.status(500).json({ error: 'Erro interno do servidor' })
}
