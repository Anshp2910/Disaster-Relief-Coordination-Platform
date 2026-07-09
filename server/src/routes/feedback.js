import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId } from '../middleware/validate.js'
import { Feedback } from '../models/Feedback.js'
import { Request } from '../models/Request.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated, sendConflict, sendNotFound, sendServerError } from '../utils/response.js'

export const feedbackRouter = express.Router()

feedbackRouter.get('/request/:requestId', requireAuth, validateObjectId('requestId'), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip = (page - 1) * limit
    const [feedback, total] = await Promise.all([
      Feedback.find({ requestId: req.params.requestId })
        .populate('submittedBy', 'displayName email role')
        .populate('fulfilledBy', 'displayName email role')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments({ requestId: req.params.requestId }),
    ])
    return sendPaginated(res, { items: feedback, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    logger.error('[feedback] list error', { message: err.message })
    return sendServerError(res)
  }
})

feedbackRouter.post('/request/:requestId', requireAuth, validateObjectId('requestId'), validate('feedback'), async (req, res) => {
  try {
    const { rating, comment, deliveryConfirmed } = req.body
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' })

    const item = await Request.findById(req.params.requestId)
    if (!item) return sendNotFound(res, 'Request not found')

    const existing = await Feedback.findOne({ requestId: req.params.requestId, submittedBy: req.user._id }).lean()
    if (existing) return sendConflict(res, 'You already submitted feedback for this request')

    const feedback = await Feedback.create({
      requestId: req.params.requestId,
      submittedBy: req.user._id,
      rating,
      comment,
      deliveryConfirmed,
      fulfilledBy: item.claimedBy,
      fulfilledAt: item.status === 'Fulfilled' ? new Date() : null,
    })

    const isClaimer = item.claimedBy && item.claimedBy.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (deliveryConfirmed && item.status !== 'Fulfilled' && (isClaimer || isAdmin)) {
      item.status = 'Fulfilled'
      item.auditLog.push({ action: 'deliveryConfirmed', by: req.user._id })
      await item.save()
    }

    const populated = await feedback.populate('submittedBy', 'displayName email role')
    return sendCreated(res, { feedback: populated })
  } catch (err) {
    logger.error('[feedback] create error', { message: err.message })
    return sendServerError(res)
  }
})

feedbackRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalFeedback: { $sum: 1 }, confirmedDeliveries: { $sum: { $cond: ['$deliveryConfirmed', 1, 0] } } } },
    ])
    return sendSuccess(res, { data: { stats: stats[0] || { avgRating: 0, totalFeedback: 0, confirmedDeliveries: 0 } } })
  } catch (err) {
    logger.error('[feedback] stats error', { message: err.message })
    return sendServerError(res)
  }
})
