import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const sosRouter = express.Router()

sosRouter.post('/broadcast', requireAuth, validate('sosAlert'), async (req, res) => {
  try {
    const { message, lat, lng, zoneId } = req.body
    const alert = {
      id: `sos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: message || 'SOS Emergency Alert',
      lat: lat || null,
      lng: lng || null,
      zoneId: zoneId || null,
      userId: req.user._id,
      userName: req.user.displayName,
      timestamp: new Date(),
    }

    const io = req.app.get('io')
    if (io) io.emit('sos:alert', alert)

    return res.status(201).json({ alert })
  } catch (err) {
    console.error('[sos] broadcast error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})
