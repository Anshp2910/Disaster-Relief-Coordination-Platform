import mongoose from 'mongoose'
import { getEnv } from './env.js'

export async function connectDB() {
  const mongoUri = getEnv(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/disaster_relief',
  )

  mongoose.set('strictQuery', true)
  await mongoose.connect(mongoUri)
  console.log('[db] connected')
}
