import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { SosAlert } from '../models/SosAlert.js'

export const sosRouter = express.Router()

sosRouter.post('/broadcast', requireAuth, validate('sosAlert'), async (req, res) => {
  try {
    const { message, lat, lng, zoneId } = req.body

    const alert = await SosAlert.create({
      message: message || 'SOS Emergency Alert',
      lat: lat || null,
      lng: lng || null,
      zoneId: zoneId || null,
      userId: req.user._id,
      userName: req.user.displayName,
    })

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('sos:alert', {
          id: alert._id.toString(),
          message: alert.message,
          lat: alert.lat,
          lng: alert.lng,
          zoneId: alert.zoneId,
          userId: alert.userId,
          userName: alert.userName,
          timestamp: alert.createdAt,
        })
      } catch (err) {
        console.error('[ws] emit sos:alert error:', err.message)
      }
    }

    return res.status(201).json({ alert })
  } catch (err) {
    console.error('[sos] broadcast error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

sosRouter.get('/', requireAuth, validateQuery(querySchemas.sosList), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
    const status = req.query.status

    const query = {}
    if (status) query.status = status

    const [items, total] = await Promise.all([
      SosAlert.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SosAlert.countDocuments(query),
    ])

    return res.json({ items, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[sos] list error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

sosRouter.put('/:id/acknowledge', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const alert = await SosAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true },
    )
    if (!alert) return res.status(404).json({ error: 'Alert not found' })
    return res.json({ alert })
  } catch (err) {
    console.error('[sos] acknowledge error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

sosRouter.put('/:id/resolve', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const alert = await SosAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true },
    )
    if (!alert) return res.status(404).json({ error: 'Alert not found' })
    return res.json({ alert })
  } catch (err) {
    console.error('[sos] resolve error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})
