import express from 'express'
import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const authRouter = express.Router()

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

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getEnv('JWT_SECRET'), {
      expiresIn: '7d',
    })

    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

authRouter.post('/login', validate('login'), async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await user.verifyPassword(password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, getEnv('JWT_SECRET'), {
      expiresIn: '7d',
    })

    return res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    console.error('[auth] login error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
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

authRouter.put('/notifications', requireAuth, async (req, res) => {
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
    const { displayName, currentPassword, newPassword, phone, skills, notifications } = req.body || {}
    const user = await User.findById(req.user._id)

    if (displayName !== undefined) {
      if (!displayName.trim()) return res.status(400).json({ error: 'Display name required' })
      user.displayName = displayName.trim()
    }

    if (phone !== undefined) user.phone = phone
    if (skills !== undefined) user.skills = skills
    if (notifications !== undefined) user.notifications = notifications

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' })
      const ok = await user.verifyPassword(currentPassword)
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
      await user.setPassword(newPassword)
    }

    await user.save()
    return res.json({
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName, phone: user.phone, skills: user.skills, notifications: user.notifications },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})
