import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../.env') })

import { createApp } from './app.js'
import { connectDB } from './config/db.js'
import { seedAdmin } from './seed.js'

const PORT = process.env.PORT || 5001

async function start() {
  await connectDB()
  await seedAdmin()
  const app = createApp()
  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] failed to start:', err)
  process.exit(1)
})
