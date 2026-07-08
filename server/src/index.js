import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../.env') })
dotenv.config({ path: resolve(__dirname, '../.env') })

import fs from 'fs'
import { createServer } from 'http'
import { logger } from './utils/logger.js'

const PORT = process.env.PORT || 5001
const uploadsDir = resolve(__dirname, '../uploads')

async function start() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const { connectDB } = await import('./config/db.js')
  const { seedAdmin } = await import('./seed.js')
  const { createApp } = await import('./app.js')

  await connectDB()
  await seedAdmin()
  const app = createApp()
  const httpServer = createServer(app)

  const { Server } = await import('socket.io')
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const socketOrigins = [clientUrl, 'http://localhost:5001', 'https://disasterhelper.dpdns.org', 'https://disaster-relief-coordination-platform-l6mk.onrender.com'].filter(Boolean)
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (origin && socketOrigins.includes(origin)) {
          callback(null, true)
        } else {
          logger.warn('[Socket.io CORS] Rejected origin', { origin })
          callback(new Error('Not allowed by CORS'), false)
        }
      },
      credentials: true,
    },
  })

  const { default: jwt } = await import('jsonwebtoken')
  const { getJwtSecret } = await import('./config/env.js')

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
      socket.userId = decoded.sub
      socket.userRole = decoded.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    logger.info('[ws] client connected', { socketId: socket.id, userId: socket.userId })
    socket.on('chat:join', ({ requestId }) => {
      if (requestId && typeof requestId === 'string' && /^[a-f\d]{24}$/i.test(requestId)) {
        socket.join(`chat:${requestId}`)
        logger.info('[ws] joined chat room', { requestId })
      }
    })

    socket.on('chat:leave', ({ requestId }) => {
      if (requestId && typeof requestId === 'string' && /^[a-f\d]{24}$/i.test(requestId)) {
        socket.leave(`chat:${requestId}`)
        logger.info('[ws] left chat room', { requestId })
      }
    })

    socket.on('geofencing:subscribe', ({ lat, lng, radiusKm }) => {
      const latNum = Number(lat)
      const lngNum = Number(lng)
      const radius = Number(radiusKm)
      if (Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 && Number.isFinite(lngNum) && lngNum >= -180 && lngNum <= 180 && Number.isFinite(radius) && radius > 0 && radius <= 500) {
        socket.geofencing = { lat: latNum, lng: lngNum, radiusKm: radius }
        logger.info('[ws] subscribed geofencing', { lat: latNum, lng: lngNum, radius })
      }
    })

    socket.on('disconnect', () => logger.info('[ws] client disconnected', { socketId: socket.id }))
  })

  app.set('io', io)

  httpServer.listen(PORT, () => {
    logger.info(`[server] listening on port ${PORT}`)
  })
}

start().catch((err) => {
  logger.error('[server] failed to start', { message: err.message, stack: err.stack })
  process.exit(1)
})
