import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import { router } from './routes'
import { errorHandler } from './middleware/errorHandler'

const app = express()
// Lê a porta do ambiente ou padroniza para 4000
const PORT = Number(process.env.PORT) || 4000

// ── Middlewares ──────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

// ── Rotas ────────────────────────────────────────────────────
app.use('/api', router)

// ── Frontend (Arquivos Estáticos) ────────────────────────────
const frontendPath = path.join(__dirname, '../../frontend/dist')
app.use(express.static(frontendPath))

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(frontendPath, 'index.html'))
})

// ── 404 ──────────────────────────────────────────────────────
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// ── Error handler (deve ser o último middleware) ──────────────
app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TraderOS Backend rodando na porta ${PORT}`)
  console.log(`📍 Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`)
})

export default app
