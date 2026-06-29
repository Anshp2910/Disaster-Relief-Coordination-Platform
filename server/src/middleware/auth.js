import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/env.js'
import { User } from '../models/User.js'
import { logger } from '../utils/logger.js'

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Missing token', code: 'MISSING_TOKEN' })

    let payload
    try {
      payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
    } catch (jwtErr) {
      logger.warn('[auth] JWT verify failed', { name: jwtErr.name, message: jwtErr.message })
      return res.status(401).json({ error: 'Token expired or invalid', code: 'INVALID_TOKEN' })
    }

    const user = await User.findById(payload.sub).select('-passwordHash')
    if (!user) {
      logger.warn('[auth] User not found for token sub', { sub: payload.sub })
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' })
    }

    req.user = user
    return next()
  } catch (err) {
    logger.error('[auth] Unexpected error', { message: err.message })
    return res.status(500).json({ error: 'Authentication error', code: 'AUTH_ERROR' })
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}
