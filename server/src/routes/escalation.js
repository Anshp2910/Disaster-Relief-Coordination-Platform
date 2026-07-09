import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId } from '../middleware/validate.js'
import { Request } from '../models/Request.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendPaginated, sendBadRequest, sendNotFound, sendServerError } from '../utils/response.js'

export const escalationRouter = express.Router()

escalationRouter.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      Request.find({ escalated: true })
        .sort({ escalatedAt: -1 }).skip(skip).limit(limit)
        .populate('createdBy', 'displayName email').lean(),
      Request.countDocuments({ escalated: true }),
    ])
    return sendPaginated(res, { items, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    logger.error('[escalation] list error', { message: err.message })
    return sendServerError(res)
  }
})

escalationRouter.post('/:requestId', requireAuth, requireAdmin, validateObjectId('requestId'), validate('escalateRequest'), async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason || !reason.trim()) return sendBadRequest(res, 'Escalation reason required')

    const item = await Request.findById(req.params.requestId)
    if (!item) return sendNotFound(res, 'Request not found')

    item.escalated = true
    item.escalatedAt = new Date()
    item.escalationReason = reason
    item.auditLog.push({ action: 'escalated', by: req.user._id })
    await item.save()

    const io = req.app.get('io')
    if (io) {
      try { io.emit('request:escalated', { requestId: item._id, title: item.title, reason: item.escalationReason }) } catch (err) { logger.error('[ws] emit error', { message: err.message }) }
    }

    return sendSuccess(res, { data: { item } })
  } catch (err) {
    logger.error('[escalation] create error', { message: err.message })
    return sendServerError(res)
  }
})

escalationRouter.delete('/:requestId', requireAuth, requireAdmin, validateObjectId('requestId'), async (req, res) => {
  try {
    const item = await Request.findById(req.params.requestId)
    if (!item) return sendNotFound(res, 'Request not found')

    item.escalated = false
    item.escalatedAt = null
    item.escalationReason = ''
    item.auditLog.push({ action: 'de-escalated', by: req.user._id })
    await item.save()

    return sendSuccess(res, { data: { item } })
  } catch (err) {
    logger.error('[escalation] delete error', { message: err.message })
    return sendServerError(res)
  }
})
