import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/env.js'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Missing token', code: 'MISSING_TOKEN' })

    let payload
    try {
      payload = jwt.verify(token, getJwtSecret())
    } catch (jwtErr) {
      console.warn('[auth] JWT verify failed:', jwtErr.name, jwtErr.message)
      return res.status(401).json({ error: 'Token expired or invalid', code: 'INVALID_TOKEN' })
    }

    const user = await User.findById(payload.sub).select('-passwordHash')
    if (!user) {
      console.warn('[auth] User not found for token sub:', payload.sub)
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' })
    }

    req.user = user
    return next()
  } catch (err) {
    console.error('[auth] Unexpected error:', err.message)
    return res.status(500).json({ error: 'Authentication error', code: 'AUTH_ERROR' })
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}
