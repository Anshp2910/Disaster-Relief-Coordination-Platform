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
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  })

  io.on('connection', (socket) => {
    console.log('[ws] client connected:', socket.id)
    socket.on('identify', (data) => {
      console.log('[ws] identified:', data)
      socket.userId = data.userId
      socket.userRole = data.role
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
