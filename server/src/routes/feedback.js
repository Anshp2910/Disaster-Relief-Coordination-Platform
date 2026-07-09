import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId } from '../middleware/validate.js'
import { Feedback } from '../models/Feedback.js'
import { Request } from '../models/Request.js'
import { logger } from '../utils/logger.js'

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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments({ requestId: req.params.requestId }),
    ])
    res.json({ feedback, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    logger.error('[feedback] list error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

feedbackRouter.post('/request/:requestId', requireAuth, validateObjectId('requestId'), validate('feedback'), async (req, res) => {
  try {
    const { rating, comment, deliveryConfirmed } = req.body

    const item = await Request.findById(req.params.requestId)
    if (!item) return res.status(404).json({ error: 'Request not found' })

    const existing = await Feedback.findOne({ requestId: req.params.requestId, submittedBy: req.user._id }).lean()
    if (existing) return res.status(409).json({ error: 'You already submitted feedback for this request' })

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
    return res.status(201).json({ feedback: populated })
  } catch (err) {
    logger.error('[feedback] create error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

feedbackRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalFeedback: { $sum: 1 }, confirmedDeliveries: { $sum: { $cond: ['$deliveryConfirmed', 1, 0] } } } },
    ])
    res.json({ stats: stats[0] || { avgRating: 0, totalFeedback: 0, confirmedDeliveries: 0 } })
  } catch (err) {
    logger.error('[feedback] stats error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})
