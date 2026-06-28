import crypto from 'crypto'
import express from 'express'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/env.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { logger } from '../utils/logger.js'
import { sendPasswordResetEmail } from '../utils/email.js'

export const authRouter = express.Router()

const LOCKOUT_WINDOW = 15 * 60 * 1000
const MAX_ATTEMPTS = 10
const loginAttempts = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of loginAttempts) {
    if (now - record.windowStart > LOCKOUT_WINDOW) loginAttempts.delete(key)
  }
}, 60000)

function getLoginKey(email) {
  return email.toLowerCase().trim()
}

function checkLockout(email) {
  const key = getLoginKey(email)
  const record = loginAttempts.get(key)
  if (!record) return false
  if (Date.now() - record.windowStart > LOCKOUT_WINDOW) {
    loginAttempts.delete(key)
    return false
  }
  if (record.count >= MAX_ATTEMPTS) return true
  return false
}

function recordAttempt(email, success) {
  const key = getLoginKey(email)
  if (success) {
    loginAttempts.delete(key)
    return
  }
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || now - record.windowStart > LOCKOUT_WINDOW) {
    loginAttempts.set(key, { count: 1, windowStart: now })
  } else {
    record.count++
  }
}

const csrfTokens = new Map()

function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  csrfTokens.set(userId.toString(), token)
  return token
}

export function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next()
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()
  try {
    const payload = jwt.verify(authHeader.slice(7), getJwtSecret())
    const userId = payload.sub
    const headerToken = req.headers['x-csrf-token']
    const storedToken = csrfTokens.get(userId)
    if (!headerToken || !storedToken || headerToken !== storedToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }
  } catch {
    return next()
  }
  return next()
}

export function checkAndRecordAttempt(email) {
  const key = getLoginKey(email)
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || now - record.windowStart > LOCKOUT_WINDOW) {
    loginAttempts.set(key, { count: 1, windowStart: now })
    return false
  }
  if (record.count >= MAX_ATTEMPTS) return true
  record.count++
  return false
}

authRouter.post('/register', validate('register'), async (req, res) => {
  try {
    const { email, password, role, displayName } = req.body || {}

    if (!email || !password || !role || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!['volunteer', 'ngo'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const user = new User({ email, role, displayName, passwordHash: '' })
    await user.setPassword(password)
    await user.save()

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), {
      expiresIn: '7d',
    })

    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    logger.error('[auth] register error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.post('/login', validate('login'), async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

    if (checkAndRecordAttempt(email)) {
      return res.status(429).json({ error: 'Too many attempts. Account locked for 15 minutes.' })
    }

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await user.verifyPassword(password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    loginAttempts.delete(getLoginKey(email))

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), {
      expiresIn: '24h',
    })

    const csrfToken = generateCsrfToken(user._id)

    return res.json({
      token,
      csrfToken,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    logger.error('[auth] login error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'Email required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.json({ ok: true })

    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = new Date(Date.now() + 3600000)
    await user.save()

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const resetUrl = `${clientUrl}/#/reset-password?token=${resetToken}`

    logger.info('password-reset-token-generated', { email })

    const sent = await sendPasswordResetEmail(user.email, resetUrl)
    if (!sent) {
      logger.info('password-reset-console', { email, resetUrl })
    }

    const payload = { ok: true }
    if (process.env.NODE_ENV !== 'production') {
      if (typeof sent === 'string') payload.devPreviewUrl = sent
      else payload.devResetUrl = resetUrl
    }
    return res.json(payload)
  } catch (err) {
    logger.error('[auth] forgot-password error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } })
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' })

    await user.setPassword(password)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    return res.json({ ok: true })
  } catch (err) {
    logger.error('[auth] reset-password error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.post('/social/:provider', async (req, res) => {
  const { provider } = req.params
  if (!['google', 'github'].includes(provider)) {
    return res.status(400).json({ error: 'Unsupported social provider' })
  }
  return res.status(501).json({ error: `${provider} login not configured. Social login coming soon.` })
})

authRouter.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body || {}
    if (!token) return res.status(400).json({ error: 'Token required' })

    let decoded
    try {
      decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
    } catch (verifyErr) {
      if (verifyErr.name === 'TokenExpiredError') {
        decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'], ignoreExpiration: true })
      } else {
        return res.status(401).json({ error: 'Invalid token' })
      }
    }

    if (!decoded.sub || !decoded.exp || !decoded.iat) {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    const user = await User.findById(decoded.sub)
    if (!user) return res.status(401).json({ error: 'User not found' })

    const originalDuration = decoded.exp - decoded.iat
    const newToken = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), {
      expiresIn: Math.max(originalDuration, 3600),
    })

    return res.json({ token: newToken })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

authRouter.get('/csrf-token', requireAuth, (req, res) => {
  const csrfToken = generateCsrfToken(req.user._id)
  return res.json({ csrfToken })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      displayName: req.user.displayName,
    },
  })
})

authRouter.get('/notifications', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications')
    return res.json({ notifications: user?.notifications || { email: true, sms: false, newRequest: true, statusChange: true, newComment: true } })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.put('/notifications', requireAuth, validate('updateNotifications'), async (req, res) => {
  try {
    const { email, sms, newRequest, statusChange, newComment } = req.body || {}
    const notifications = {}
    if (email !== undefined) notifications.email = Boolean(email)
    if (sms !== undefined) notifications.sms = Boolean(sms)
    if (newRequest !== undefined) notifications.newRequest = Boolean(newRequest)
    if (statusChange !== undefined) notifications.statusChange = Boolean(statusChange)
    if (newComment !== undefined) notifications.newComment = Boolean(newComment)

    await User.findByIdAndUpdate(req.user._id, { $set: { notifications } }, { new: true })
    return res.json({ notifications })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.put('/profile', requireAuth, validate('updateProfile'), async (req, res) => {
  try {
    const { displayName, currentPassword, newPassword, phone, skills, notifications, avatar } = req.body || {}
    const user = await User.findById(req.user._id)

    if (displayName !== undefined) {
      if (!displayName.trim()) return res.status(400).json({ error: 'Display name required' })
      user.displayName = displayName.trim()
    }

    if (phone !== undefined) user.phone = phone
    if (skills !== undefined) user.skills = skills
    if (notifications !== undefined) user.notifications = notifications
    if (avatar !== undefined) user.avatar = avatar

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' })
      const ok = await user.verifyPassword(currentPassword)
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
      await user.setPassword(newPassword)
    }

    await user.save()
    return res.json({
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName, phone: user.phone, skills: user.skills, notifications: user.notifications, avatar: user.avatar },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})
