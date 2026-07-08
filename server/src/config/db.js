import mongoose from 'mongoose'
import dns from 'dns'
import { URL } from 'url'
import { getEnv } from './env.js'
import { logger } from '../utils/logger.js'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 5000
const DNS_FALLBACK_SERVERS = ['8.8.8.8', '1.1.1.1']

async function resolveSrvUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri

  const url = new URL(uri.replace(/^mongodb\+srv:/, 'https:'))
  const hostname = url.hostname

  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`)
    return uri
  } catch {
    logger.warn(`[db] SRV lookup failed for ${hostname}, trying fallback DNS`)
    const originalServers = dns.getServers()
    dns.setServers(DNS_FALLBACK_SERVERS)

    try {
      const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`)
      const txtRecords = await dns.promises.resolveTxt(hostname)
      const txtParams = Object.fromEntries(
        txtRecords.flat().flatMap((entry) => entry.split('&').map((p) => p.split('='))),
      )
      const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',')

      let newUri = `mongodb://${url.username ? `${url.username}:${url.password}@` : ''}${hosts}`
      if (url.pathname && url.pathname !== '/') newUri += url.pathname

      const params = new URLSearchParams()
      params.set('ssl', 'true')
      for (const [k, v] of Object.entries(txtParams)) params.set(k, v)
      url.searchParams.forEach((v, k) => params.set(k, v))
      const paramStr = params.toString()
      if (paramStr) newUri += `?${paramStr}`

      logger.info('[db] converted mongodb+srv:// to mongodb:// URI')
      return newUri
    } finally {
      dns.setServers(originalServers)
    }
  }
}

export async function connectDB(retries = MAX_RETRIES) {
  const rawUri = getEnv(
    'MONGODB_URI',
    'mongodb://127.0.0.1:27017/disaster_relief',
  )
  const mongoUri = await resolveSrvUri(rawUri)

  mongoose.set('strictQuery', true)

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
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
