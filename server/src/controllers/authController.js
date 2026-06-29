import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { getJwtSecret } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { sendPasswordResetEmail } from '../utils/email.js'

const JWT_SECRET = () => getJwtSecret()

const csrfStore = {
  async set(userId, token) {
    try {
      await User.findByIdAndUpdate(userId, { $set: { csrfToken: token, csrfExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) } })
    } catch {
      logger.warn('[csrf] MongoDB unavailable for csrf store')
    }
  },
  async get(userId) {
    try {
      const user = await User.findById(userId).select('csrfToken csrfExpires').lean()
      if (user && user.csrfExpires && user.csrfExpires > new Date()) return user.csrfToken
      return null
    } catch {
      return null
    }
  },
  async clear(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $unset: { csrfToken: 1, csrfExpires: 1 } })
    } catch {
    }
  },
}

const LOCKOUT_WINDOW = 15 * 60 * 1000
const MAX_ATTEMPTS = 10
const loginAttempts = new Map()
const resetTokens = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [key, record] of loginAttempts) {
    if (now - record.windowStart > LOCKOUT_WINDOW) loginAttempts.delete(key)
  }
  for (const [token, entry] of resetTokens) {
    if (entry.expiresAt <= Date.now()) resetTokens.delete(token)
  }
}, 60000)

function getLoginKey(email) {
  return email.toLowerCase().trim()
}

function checkAndRecordAttempt(email) {
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

async function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  await csrfStore.set(userId.toString(), token)
  return token
}

export async function verifyCsrf(req, res, next) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next()
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET())
    const userId = payload.sub
    const headerToken = req.headers['x-csrf-token']
    const storedToken = await csrfStore.get(userId)
    if (!headerToken || !storedToken || headerToken !== storedToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }
  } catch {
    return next()
  }
  return next()
}

export async function register(req, res) {
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

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET(), { expiresIn: '7d' })
    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    logger.error('[auth] register error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })
    if (checkAndRecordAttempt(email)) {
      return res.status(429).json({ error: 'Too many attempts. Account locked for 15 minutes.' })
    }

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.provider !== 'local') {
      return res.status(401).json({ error: 'This account uses social login. Please sign in with ' + user.provider + '.' })
    }

    const ok = await user.verifyPassword(password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    loginAttempts.delete(getLoginKey(email))

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET(), { expiresIn: '24h' })
    const csrfToken = await generateCsrfToken(user._id)

    return res.json({
      token,
      csrfToken,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    logger.error('[auth] login error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'Email required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetUrl = `${clientUrl}/#/reset-password?token=${resetToken}`

    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() })
      if (user) {
        user.resetPasswordToken = resetToken
        user.resetPasswordExpires = new Date(Date.now() + 3600000)
        await user.save()
        logger.info('password-reset-token-generated', { email })
      }
    } catch (dbErr) {
      logger.warn('[auth] MongoDB unavailable for password reset', { email, message: dbErr.message })
    }

    resetTokens.set(resetToken, { email: email.toLowerCase().trim(), expiresAt: Date.now() + 3600000 })
    const sent = await sendPasswordResetEmail(email, resetUrl)
    if (!sent) logger.info('password-reset-console', { email, resetUrl })

    const payload = { ok: true, emailSent: !!sent }
    if (typeof sent === 'string') payload.emailPreviewUrl = sent
    if (!sent) payload.resetUrl = resetUrl
    return res.json(payload)
  } catch (err) {
    logger.error('[auth] forgot-password error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })

    try {
      const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } })
      if (user) {
        await user.setPassword(password)
        user.resetPasswordToken = undefined
        user.resetPasswordExpires = undefined
        await user.save()
        return res.json({ ok: true })
      }
    } catch {
      logger.warn('[auth] MongoDB unavailable for reset — checking in-memory store')
    }

    const entry = resetTokens.get(token)
    if (!entry || entry.expiresAt <= Date.now()) {
      resetTokens.delete(token)
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }
    resetTokens.delete(token)
    return res.json({ ok: true })
  } catch (err) {
    logger.error('[auth] reset-password error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function refresh(req, res) {
  try {
    const { token } = req.body || {}
    if (!token) return res.status(400).json({ error: 'Token required' })

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET(), { algorithms: ['HS256'] })
    } catch (verifyErr) {
      if (verifyErr.name === 'TokenExpiredError') {
        decoded = jwt.verify(token, JWT_SECRET(), { algorithms: ['HS256'], ignoreExpiration: true })
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
    const newToken = jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET(), {
      expiresIn: Math.max(originalDuration, 3600),
    })
    return res.json({ token: newToken })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export async function getMe(req, res) {
  return res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      displayName: req.user.displayName,
    },
  })
}

export async function getCsrfToken(req, res) {
  const csrfToken = await generateCsrfToken(req.user._id)
  return res.json({ csrfToken })
}

export async function getNotifications(req, res) {
  try {
    const user = await User.findById(req.user._id).select('notifications')
    return res.json({ notifications: user?.notifications || { email: true, sms: false, newRequest: true, statusChange: true, newComment: true } })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function updateNotifications(req, res) {
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
}

export async function updateProfile(req, res) {
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
}
