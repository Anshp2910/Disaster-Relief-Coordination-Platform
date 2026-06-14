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
import { resourcesRouter } from './routes/resources.js'
import { zonesRouter } from './routes/zones.js'
import { chatRouter } from './routes/chat.js'
import { feedbackRouter } from './routes/feedback.js'
import { schedulesRouter } from './routes/schedules.js'
import { incidentsRouter } from './routes/incidents.js'
import { bulkRouter } from './routes/bulk.js'
import { escalationRouter } from './routes/escalation.js'
import { geofencingRouter } from './routes/geofencing.js'
import { sosRouter } from './routes/sos.js'
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
        connectSrc: ["'self'", "ws:", "wss:", "http://localhost:5001", "http://localhost:5173"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }))

  const allowedOrigins = [
    getEnv('CLIENT_URL', 'http://localhost:5173'),
    'http://localhost:5173',
    'http://localhost:5001',
  ]

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'), false)
        }
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

  app.get('/health', (req, res) => res.json({ ok: true }))

  app.use('/api/auth', authLimiter, authRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/resources', resourcesRouter)
  app.use('/api/zones', zonesRouter)
  app.use('/api/chat', chatRouter)
  app.use('/api/feedback', feedbackRouter)
  app.use('/api/schedules', schedulesRouter)
  app.use('/api/incidents', incidentsRouter)
  app.use('/api/bulk', bulkRouter)
  app.use('/api/escalation', escalationRouter)
  app.use('/api/geofencing', geofencingRouter)
  app.use('/api/sos', sosRouter)

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' })
  })

  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })

  app.use((err, req, res, next) => {
    console.error('[error]', err.message)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format' })
    }
    if (err.name === 'MulterError') {
      return res.status(400).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
