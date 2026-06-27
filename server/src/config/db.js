import mongoose from 'mongoose'
import { getEnv } from './env.js'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 5000

export async function connectDB(retries = MAX_RETRIES) {
  const mongoUri = getEnv(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/disaster_relief',
  )

  mongoose.set('strictQuery', true)

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri)
      console.log('[db] connected')
      return
    } catch (err) {
      console.error(`[db] connection attempt ${attempt}/${retries} failed:`, err.message)
      if (attempt === retries) {
        console.error('[db] all connection attempts exhausted')
        throw err
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[db] disconnected, attempting reconnection...')
})

mongoose.connection.on('error', (err) => {
  console.error('[db] connection error:', err.message)
})
