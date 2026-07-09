import crypto from 'crypto'
import express from 'express'
import jwt from 'jsonwebtoken'
import passport from 'passport'
import rateLimit from 'express-rate-limit'
import { getJwtSecret } from '../config/env.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { logger } from '../utils/logger.js'
import { sendPasswordResetEmail } from '../utils/email.js'
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendConflict, sendTooMany, sendServerError, sendNotFound } from '../utils/response.js'
import '../config/passport.js'

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many refresh requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many CSRF token requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

export const authRouter = express.Router()

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

const csrfTokens = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [key, token] of csrfTokens) {
    if (now - token.createdAt > LOCKOUT_WINDOW) csrfTokens.delete(key)
  }
}, 60000)

function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  csrfTokens.set(userId.toString(), { token, createdAt: Date.now() })
  return token
}

function verifyCsrfToken(userId, token) {
  const entry = csrfTokens.get(userId?.toString())
  if (!entry || entry.token !== token) return false
  csrfTokens.delete(userId.toString())
  return true
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
      return sendBadRequest(res, 'Missing required fields')
    }
    if (!['volunteer', 'ngo'].includes(role)) {
      return sendBadRequest(res, 'Invalid role')
    }

    const existing = await User.findOne({ email })
    if (existing) {
      logger.warn('[auth] duplicate registration attempt', { email })
      return sendConflict(res, 'Email already in use')
    }

    const user = new User({ email, role, displayName, passwordHash: '' })
    await user.setPassword(password)
    await user.save()

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: '24h' })

    return sendCreated(res, {
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    logger.error('[auth] register error', { message: err.message })
    return sendServerError(res)
  }
})

authRouter.post('/login', validate('login'), async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return sendBadRequest(res, 'Missing email or password')

    if (checkAndRecordAttempt(email)) {
      logger.warn('[auth] account locked due to too many attempts', { email })
      return sendTooMany(res, 'Too many attempts. Account locked for 15 minutes.')
    }

    const user = await User.findOne({ email })
    if (!user) {
      // Don't reveal whether the email exists — always return "Invalid credentials"
      return sendUnauthorized(res, 'Invalid credentials')
    }
    if (user.provider !== 'local') {
      return sendUnauthorized(res, 'Invalid credentials')
    }

    const ok = await user.verifyPassword(password)
    if (!ok) return sendUnauthorized(res, 'Invalid credentials')

    loginAttempts.delete(getLoginKey(email))

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: '24h' })
    const csrfToken = generateCsrfToken(user._id)

    return sendSuccess(res, {
      data: {
        token,
        csrfToken,
        user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
      },
    })
  } catch (err) {
    logger.error('[auth] login error', { message: err.message })
    return sendServerError(res)
  }
})

authRouter.post('/forgot-password', validate('forgotPassword'), async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return sendBadRequest(res, 'Email required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendBadRequest(res, 'Invalid email format')
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
      logger.warn('[auth] MongoDB unavailable — using in-memory token store', { email, message: dbErr.message })
    }

    resetTokens.set(resetToken, { email: email.toLowerCase().trim(), expiresAt: Date.now() + 3600000 })

    const sent = await sendPasswordResetEmail(email, resetUrl)
    if (!sent) {
      logger.info('password-reset-console', { email, resetUrl })
    }

    // Always return 200 to prevent email enumeration
    return sendSuccess(res, {
      data: { ok: true, emailSent: !!sent },
    })
  } catch (err) {
    logger.error('[auth] forgot-password error', { message: err.message })
    return sendServerError(res)
  }
})

authRouter.post('/reset-password', validate('resetPassword'), async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (!token || !password) return sendBadRequest(res, 'Token and password required')

    let user = null
    try {
      user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } })
    } catch {
      logger.warn('[auth] MongoDB unavailable for reset — checking in-memory store')
    }

    if (user) {
      await user.setPassword(password)
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      await user.save()
      return sendSuccess(res, { data: { ok: true } })
    }

    const entry = resetTokens.get(token)
    if (!entry || entry.expiresAt <= Date.now()) {
      resetTokens.delete(token)
      return sendBadRequest(res, 'Invalid or expired reset token')
    }
    resetTokens.delete(token)

    try {
      const fallbackUser = await User.findOne({ email: entry.email })
      if (fallbackUser) {
        await fallbackUser.setPassword(password)
        await fallbackUser.save()
        return sendSuccess(res, { data: { ok: true } })
      }
    } catch {
      logger.warn('[auth] MongoDB still unavailable — cannot reset password')
      return res.status(503).json({ success: false, error: 'Password reset unavailable, please try again later' })
    }

    return sendBadRequest(res, 'Invalid or expired reset token')
  } catch (err) {
    logger.error('[auth] reset-password error', { message: err.message })
    return sendServerError(res)
  }
})

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authRouter.get('/google', passport.authenticate('google', { session: false }))
  authRouter.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err || !user) {
        return res.redirect(`${CLIENT_URL}/#/login?error=google-auth-failed`)
      }
      const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: '24h' })
      const csrfToken = generateCsrfToken(user._id)
      res.redirect(`${CLIENT_URL}/#/social-callback?token=${encodeURIComponent(token)}&csrf=${encodeURIComponent(csrfToken)}`)
    })(req, res, next)
  })
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  authRouter.get('/github', passport.authenticate('github', { session: false }))
  authRouter.get('/github/callback', (req, res, next) => {
    passport.authenticate('github', { session: false }, (err, user) => {
      if (err || !user) {
        return res.redirect(`${CLIENT_URL}/#/login?error=github-auth-failed`)
      }
      const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: '24h' })
      const csrfToken = generateCsrfToken(user._id)
      res.redirect(`${CLIENT_URL}/#/social-callback?token=${encodeURIComponent(token)}&csrf=${encodeURIComponent(csrfToken)}`)
    })(req, res, next)
  })
}

authRouter.post('/refresh', refreshLimiter, validate('refresh'), async (req, res) => {
  try {
    const { token } = req.body || {}
    if (!token) return sendBadRequest(res, 'Token required')

    let decoded
    try {
      decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
    } catch {
      return sendUnauthorized(res, 'Invalid or expired token')
    }

    if (!decoded.sub || !decoded.exp || !decoded.iat) {
      return sendUnauthorized(res, 'Invalid token payload')
    }

    const user = await User.findById(decoded.sub)
    if (!user) return sendUnauthorized(res, 'User not found')

    const originalDuration = decoded.exp - decoded.iat
    const refreshDuration = Math.min(Math.max(originalDuration, 3600), 86400 * 7)
    const newToken = jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: refreshDuration })

    return sendSuccess(res, { data: { token: newToken } })
  } catch (err) {
    logger.error('[auth] refresh error', { message: err.message })
    return sendUnauthorized(res, 'Invalid token')
  }
})

authRouter.get('/csrf-token', csrfLimiter, requireAuth, (req, res) => {
  const csrfToken = generateCsrfToken(req.user._id)
  return sendSuccess(res, { data: { csrfToken } })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  return sendSuccess(res, {
    data: {
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        displayName: req.user.displayName,
      },
    },
  })
})

authRouter.get('/notifications', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications')
    return sendSuccess(res, {
      data: { notifications: user?.notifications || { email: true, sms: false, newRequest: true, statusChange: true, newComment: true } },
    })
  } catch (err) {
    logger.error('[auth] notifications error', { message: err.message })
    return sendServerError(res)
  }
})

authRouter.put('/notifications', requireAuth, validate('updateNotifications'), async (req, res) => {
  try {
    const notificationFields = ['email', 'sms', 'newRequest', 'statusChange', 'newComment']
    const notifications = {}
    for (const field of notificationFields) {
      if (req.body[field] !== undefined) notifications[field] = Boolean(req.body[field])
    }
    await User.findByIdAndUpdate(req.user._id, { $set: { notifications } }, { new: true })
    return sendSuccess(res, { data: { notifications } })
  } catch (err) {
    logger.error('[auth] notification update error', { message: err.message })
    return sendServerError(res)
  }
})

authRouter.put('/profile', requireAuth, validate('updateProfile'), async (req, res) => {
  try {
    const { displayName, currentPassword, newPassword, phone, skills, notifications, avatar } = req.body || {}
    const user = await User.findById(req.user._id)

    if (displayName !== undefined) {
      if (!displayName.trim()) return sendBadRequest(res, 'Display name required')
      user.displayName = displayName.trim()
    }
    if (phone !== undefined) user.phone = phone
    if (skills !== undefined) user.skills = skills
    if (notifications !== undefined) user.notifications = notifications
    if (avatar !== undefined) user.avatar = avatar

    if (newPassword) {
      if (!currentPassword) return sendBadRequest(res, 'Current password required')
      const ok = await user.verifyPassword(currentPassword)
      if (!ok) return sendUnauthorized(res, 'Current password is incorrect')
      await user.setPassword(newPassword)
    }

    await user.save()
    return sendSuccess(res, {
      data: {
        user: {
          id: user._id, email: user.email, role: user.role, displayName: user.displayName,
          phone: user.phone, skills: user.skills, notifications: user.notifications, avatar: user.avatar,
        },
      },
    })
  } catch (err) {
    logger.error('[auth] profile update error', { message: err.message })
    return sendServerError(res)
  }
})
