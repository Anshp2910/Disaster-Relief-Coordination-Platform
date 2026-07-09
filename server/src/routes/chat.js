import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { Request } from '../models/Request.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated, sendNotFound, sendForbidden, sendServerError } from '../utils/response.js'

export const chatRouter = express.Router()

chatRouter.get('/:requestId', requireAuth, validateObjectId('requestId'), validateQuery(querySchemas.chatMessages), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).select('_id').lean()
    if (!request) return sendNotFound(res, 'Request not found')

    const { page = 1, limit = 50 } = req.query
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [messages, total] = await Promise.all([
      ChatMessage.find({ requestId: req.params.requestId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('sender', 'displayName email role avatar').lean(),
      ChatMessage.countDocuments({ requestId: req.params.requestId }),
    ])
    return sendPaginated(res, { items: messages.reverse(), total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    logger.error('[chat] list error', { message: err.message })
    return sendServerError(res)
  }
})

chatRouter.post('/:requestId', requireAuth, validateObjectId('requestId'), validate('chatMessage'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).select('_id').lean()
    if (!request) return sendNotFound(res, 'Request not found')

    const { text } = req.body
    if (!text || !text.trim()) return res.status(400).json({ success: false, error: 'Message text required' })

    const message = await ChatMessage.create({ requestId: req.params.requestId, sender: req.user._id, text })
    const populated = await message.populate('sender', 'displayName email role avatar')

    const io = req.app.get('io')
    if (io) {
      io.to(`chat:${req.params.requestId}`).emit('chat:message', { message: populated })
    }

    return sendCreated(res, { message: populated })
  } catch (err) {
    logger.error('[chat] create error', { message: err.message })
    return sendServerError(res)
  }
})

chatRouter.delete('/:requestId/:messageId', requireAuth, validateObjectId('requestId'), validateObjectId('messageId'), async (req, res) => {
  try {
    const message = await ChatMessage.findOne({ _id: req.params.messageId, requestId: req.params.requestId })
    if (!message) return sendNotFound(res, 'Message not found')

    const isAuthor = message.sender.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isAuthor && !isAdmin) return sendForbidden(res)

    await message.deleteOne()
    return sendSuccess(res, { data: { deleted: true } })
  } catch (err) {
    logger.error('[chat] delete error', { message: err.message })
    return sendServerError(res)
  }
})
