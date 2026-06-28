import mongoose from 'mongoose'
import { getEnv } from './env.js'
import { logger } from '../utils/logger.js'

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
      logger.info('[db] connected')
      return
    } catch (err) {
      logger.error(`[db] connection attempt ${attempt}/${retries} failed`, { message: err.message })
      if (attempt === retries) {
        logger.error('[db] all connection attempts exhausted')
        throw err
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('[db] disconnected, attempting reconnection...')
})

mongoose.connection.on('error', (err) => {
  logger.error('[db] connection error', { message: err.message })
})
