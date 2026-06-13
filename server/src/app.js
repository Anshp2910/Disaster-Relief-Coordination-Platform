import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { authRouter } from './routes/auth.js'
import { requestsRouter } from './routes/requests.js'
import { adminRouter } from './routes/admin.js'

dotenv.config()

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  )
  app.use(express.json())

  app.get('/health', (req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/admin', adminRouter)

  return app
}
