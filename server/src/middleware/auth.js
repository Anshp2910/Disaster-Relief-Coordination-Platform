import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Missing token' })

    const payload = jwt.verify(token, getEnv('JWT_SECRET', 'dev_jwt_secret_change_me'))
    const user = await User.findById(payload.sub).select('-passwordHash')
    if (!user) return res.status(401).json({ error: 'Invalid token' })

    req.user = user
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}
