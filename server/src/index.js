import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'fs'
import { createServer } from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../.env') })

import { createApp } from './app.js'
import { connectDB } from './config/db.js'
import { seedAdmin } from './seed.js'

const PORT = process.env.PORT || 5001
const uploadsDir = resolve(__dirname, '../uploads')

async function start() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  await connectDB()
  await seedAdmin()
  const app = createApp()
  const httpServer = createServer(app)

  const { Server } = await import('socket.io')
  const io = new Server(httpServer, {
    cors: { origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5001', 'https://disasterhelper.dpdns.org'], credentials: true },
  })

  const { default: jwt } = await import('jsonwebtoken')
  const { getEnv } = await import('./config/env.js')

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const decoded = jwt.verify(token, getEnv('JWT_SECRET', 'dev_jwt_secret_change_me'))
      socket.userId = decoded.sub
      socket.userRole = decoded.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log('[ws] client connected:', socket.id, 'userId:', socket.userId)
    socket.on('chat:join', ({ requestId }) => {
      if (requestId && typeof requestId === 'string' && /^[a-f\d]{24}$/i.test(requestId)) {
        socket.join(`chat:${requestId}`)
        console.log('[ws] joined chat room:', requestId)
      }
    })

    socket.on('chat:leave', ({ requestId }) => {
      if (requestId && typeof requestId === 'string' && /^[a-f\d]{24}$/i.test(requestId)) {
        socket.leave(`chat:${requestId}`)
        console.log('[ws] left chat room:', requestId)
      }
    })

    socket.on('geofencing:subscribe', ({ lat, lng, radiusKm }) => {
      const latNum = Number(lat)
      const lngNum = Number(lng)
      const radius = Number(radiusKm)
      if (Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 && Number.isFinite(lngNum) && lngNum >= -180 && lngNum <= 180 && Number.isFinite(radius) && radius > 0 && radius <= 500) {
        socket.geofencing = { lat: latNum, lng: lngNum, radiusKm: radius }
        console.log('[ws] subscribed geofencing:', latNum, lngNum, radius)
      }
    })

    socket.on('disconnect', () => console.log('[ws] client disconnected:', socket.id))
  })

  app.set('io', io)

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] failed to start:', err)
  process.exit(1)
})
