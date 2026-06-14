import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import { authRouter } from './routes/auth.js'
import { requestsRouter } from './routes/requests.js'
import { adminRouter } from './routes/admin.js'
import { getEnv } from './config/env.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

export function createApp() {
  const app = express()

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https://*.tile.openstreetmap.org", "data:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        connectSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }))
  app.use(
    cors({
      origin: getEnv('CLIENT_URL', 'http://localhost:5173'),
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

  app.get('/health', (req, res) => res.json({ ok: true }))

  app.use('/api/auth', authLimiter, authRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/admin', adminRouter)

  app.use((err, req, res, next) => {
    console.error('[error]', err.message)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
