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

    const token = jwt.sign({ sub: user._id.toString() }, getEnv('JWT_SECRET', 'dev_jwt_secret_change_me'), {
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

    const token = jwt.sign({ sub: user._id.toString() }, getEnv('JWT_SECRET', 'dev_jwt_secret_change_me'), {
      expiresIn: '7d',
    })

    return res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
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

authRouter.put('/profile', requireAuth, validate('updateProfile'), async (req, res) => {
  try {
    const { displayName, currentPassword, newPassword } = req.body || {}
    const user = await User.findById(req.user._id)

    if (displayName !== undefined) {
      if (!displayName.trim()) return res.status(400).json({ error: 'Display name required' })
      user.displayName = displayName.trim()
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' })
      const ok = await user.verifyPassword(currentPassword)
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
      await user.setPassword(newPassword)
    }

    await user.save()
    return res.json({
      user: { id: user._id, email: user.email, role: user.role, displayName: user.displayName },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})
