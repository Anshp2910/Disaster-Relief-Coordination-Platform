import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { SosAlert } from '../models/SosAlert.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated, sendBadRequest, sendNotFound, sendForbidden, sendServerError } from '../utils/response.js'

export const sosRouter = express.Router()

sosRouter.post('/broadcast', requireAuth, validate('sosAlert'), async (req, res) => {
  try {
    const { message, lat, lng, zoneId } = req.body

    // Validate lat/lng ranges if provided
    if (lat != null && (lat < -90 || lat > 90)) return sendBadRequest(res, 'Invalid latitude (-90 to 90)')
    if (lng != null && (lng < -180 || lng > 180)) return sendBadRequest(res, 'Invalid longitude (-180 to 180)')

    // Duplicate alert detection: same user, same location (±0.01°), within 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (lat != null && lng != null) {
      const recent = await SosAlert.findOne({
        userId: req.user._id,
        lat: { $gte: lat - 0.01, $lte: lat + 0.01 },
        lng: { $gte: lng - 0.01, $lte: lng + 0.01 },
        createdAt: { $gte: fiveMinAgo },
      }).lean()
      if (recent) {
        logger.warn('[sos] duplicate alert suppressed', { userId: req.user._id.toString() })
        return sendSuccess(res, { data: { alert: recent, note: 'Duplicate suppressed — alert already active' } })
      }
    }

    const alert = await SosAlert.create({
      message: message || 'SOS Emergency Alert',
      lat: lat ?? null,
      lng: lng ?? null,
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
        logger.error('[ws] emit sos:alert error', { message: err.message })
      }
    }

    return sendCreated(res, { alert })
  } catch (err) {
    logger.error('[sos] broadcast error', { message: err.message })
    return sendServerError(res)
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
      SosAlert.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SosAlert.countDocuments(query),
    ])

    return sendPaginated(res, { items, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    logger.error('[sos] list error', { message: err.message })
    return sendServerError(res)
  }
})

sosRouter.put('/:id/acknowledge', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return sendForbidden(res)
    const alert = await SosAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true },
    )
    if (!alert) return sendNotFound(res, 'Alert not found')
    return sendSuccess(res, { data: { alert } })
  } catch (err) {
    logger.error('[sos] acknowledge error', { message: err.message })
    return sendServerError(res)
  }
})

sosRouter.put('/:id/resolve', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return sendForbidden(res)
    const alert = await SosAlert.findByIdAndUpdate(req.params.id, { status: 'resolved' }, { new: true })
    if (!alert) return sendNotFound(res, 'Alert not found')
    return sendSuccess(res, { data: { alert } })
  } catch (err) {
    logger.error('[sos] resolve error', { message: err.message })
    return sendServerError(res)
  }
})
