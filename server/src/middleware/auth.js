import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/env.js'
import { User } from '../models/User.js'
import { logger } from '../utils/logger.js'
import { sendUnauthorized, sendForbidden, sendServerError } from '../utils/response.js'

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    if (!auth.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'Missing or malformed token — use "Bearer <token>"')
    }
    const token = auth.slice(7)
    if (!token) {
      return sendUnauthorized(res, 'Missing token')
    }

    let payload
    try {
      payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
    } catch (jwtErr) {
      logger.warn('[auth] JWT verify failed', { name: jwtErr.name, message: jwtErr.message })
      const msg = jwtErr.name === 'TokenExpiredError' ? 'Token expired' : 'Token invalid'
      return sendUnauthorized(res, msg)
    }

    const user = await User.findById(payload.sub).select('-passwordHash')
    if (!user) {
      logger.warn('[auth] User not found for token sub', { sub: payload.sub })
      return sendUnauthorized(res, 'User not found')
    }

    req.user = user
    return next()
  } catch (err) {
    logger.error('[auth] Unexpected error', { message: err.message })
    return sendServerError(res)
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return sendUnauthorized(res)
  }
  if (req.user.role !== 'admin') {
    return sendForbidden(res, 'Admin access required')
  }
  return next()
}
