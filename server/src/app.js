import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
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
import weatherRouter from './routes/weather.js'
import publicRouter from './routes/public.js'
import { getEnv } from './config/env.js'
import { sanitizeBody } from './middleware/sanitize.js'
import { rateLimitUser } from './middleware/rateLimitUser.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const bulkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many import requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  const clientUrl = getEnv('CLIENT_URL', 'http://localhost:5173')

  const baseOrigins = [
    'http://localhost:5173',
    'http://localhost:5001',
    'https://disasterhelper.dpdns.org',
    'https://disaster-relief-coordination-platform-l6mk.onrender.com',
  ]
  const allOrigins = [...new Set([...baseOrigins, clientUrl])]

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https://*.tile.openstreetmap.org", "data:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
        connectSrc: ["'self'", "ws:", "wss:", "https://*.tile.openstreetmap.org", "https://nominatim.openstreetmap.org", ...allOrigins],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        workerSrc: ["'self'"],
        formAction: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  }))

  const allowedOrigins = allOrigins

  function isOriginAllowed(origin) {
    if (!origin) return true
    if (origin === 'null') return false
    return allowedOrigins.includes(origin)
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true)
        } else {
          console.warn('[CORS] Rejected origin (not in allowlist)')
          callback(new Error('Not allowed by CORS'), false)
        }
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))
  app.use(sanitizeBody)
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

  app.get('/health', (req, res) => res.json({ ok: true }))

  app.post('/api/log', (req, res) => {
    const { message, stack, componentStack, url, userAgent } = req.body || {}
    console.error('[client-error]', JSON.stringify({ message, url, userAgent, ts: new Date().toISOString() }))
    if (stack) console.error('[client-error-stack]', stack)
    if (componentStack) console.error('[client-error-component]', componentStack)
    res.status(204).end()
  })

  app.use('/api/auth', authLimiter, authRouter)
  const writeLimiter = rateLimitUser({ windowMs: 60 * 1000, max: 30, message: 'Too many write requests, please slow down' })
  const requestsLimiter = rateLimitUser({ windowMs: 60 * 1000, max: 60, message: 'Too many requests, please slow down' })
  const geofencingLimiter = rateLimitUser({ windowMs: 60 * 1000, max: 30, message: 'Too many geofencing requests, please slow down' })

  app.use('/api/requests', requestsLimiter, requestsRouter)
  app.use('/api/admin', rateLimitUser({ windowMs: 60 * 1000, max: 50 }), adminRouter)
  app.use('/api/resources', writeLimiter, resourcesRouter)
  app.use('/api/zones', writeLimiter, zonesRouter)
  app.use('/api/chat', writeLimiter, chatRouter)
  app.use('/api/feedback', writeLimiter, feedbackRouter)
  app.use('/api/schedules', writeLimiter, schedulesRouter)
  app.use('/api/incidents', writeLimiter, incidentsRouter)
  app.use('/api/bulk', bulkLimiter, bulkRouter)
  app.use('/api/escalation', writeLimiter, escalationRouter)
  app.use('/api/geofencing', geofencingLimiter, geofencingRouter)
  app.use('/api/sos', writeLimiter, sosRouter)
  const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many requests, please slow down' } })
  app.use('/api/weather', publicLimiter, weatherRouter)
  app.use('/api/public', publicLimiter, publicRouter)

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' })
  })

  const clientDist = path.join(__dirname, '../../client/dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use((err, req, res, next) => {
    console.error('[error]', err.message, JSON.stringify({ method: req.method, url: req.url, ts: new Date().toISOString() }))
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ID format' })
    }
    if (err.name === 'MulterError') {
      return res.status(400).json({ error: err.message })
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[error-detail]', err.stack)
    }
    return res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
