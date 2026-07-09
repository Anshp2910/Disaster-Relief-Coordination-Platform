import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId } from '../middleware/validate.js'
import { Request } from '../models/Request.js'
import { logger } from '../utils/logger.js'

export const escalationRouter = express.Router()

escalationRouter.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Request.find({ escalated: true })
        .sort({ escalatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'displayName email')
        .lean(),
      Request.countDocuments({ escalated: true }),
    ])
    res.json({ items, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    logger.error('[escalation] list error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

escalationRouter.post('/:requestId', requireAuth, requireAdmin, validateObjectId('requestId'), validate('escalateRequest'), async (req, res) => {
  try {
    const { reason } = req.body
    const item = await Request.findById(req.params.requestId)
    if (!item) return res.status(404).json({ error: 'Request not found' })

    item.escalated = true
    item.escalatedAt = new Date()
    item.escalationReason = reason
    item.auditLog.push({ action: 'escalated', by: req.user._id })
    await item.save()

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:escalated', { requestId: item._id, title: item.title, reason: item.escalationReason })
      } catch (err) {
        logger.error('[ws] emit request:escalated error', { message: err.message })
      }
    }

    return res.json({ item })
  } catch (err) {
    logger.error('[escalation] create error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

escalationRouter.delete('/:requestId', requireAuth, requireAdmin, validateObjectId('requestId'), async (req, res) => {
  try {
    const item = await Request.findById(req.params.requestId)
    if (!item) return res.status(404).json({ error: 'Request not found' })

    item.escalated = false
    item.escalatedAt = null
    item.escalationReason = ''
    item.auditLog.push({ action: 'de-escalated', by: req.user._id })
    await item.save()

    return res.json({ item })
  } catch (err) {
    logger.error('[escalation] delete error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})
