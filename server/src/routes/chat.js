import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { ChatMessage } from '../models/ChatMessage.js'

export const chatRouter = express.Router()

chatRouter.get('/:requestId', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [messages, total] = await Promise.all([
      ChatMessage.find({ requestId: req.params.requestId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('sender', 'displayName email role avatar')
        .lean(),
      ChatMessage.countDocuments({ requestId: req.params.requestId }),
    ])
    res.json({ messages: messages.reverse(), total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    console.error('[chat] list error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

chatRouter.post('/:requestId', requireAuth, validate('chatMessage'), async (req, res) => {
  try {
    const { text } = req.body
    const message = await ChatMessage.create({
      requestId: req.params.requestId,
      sender: req.user._id,
      text,
    })

    const populated = await message.populate('sender', 'displayName email role avatar')

    const io = req.app.get('io')
    if (io) {
      io.to(`chat:${req.params.requestId}`).emit('chat:message', { message: populated })
    }

    return res.status(201).json({ message: populated })
  } catch (err) {
    console.error('[chat] create error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

chatRouter.delete('/:requestId/:messageId', requireAuth, async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.messageId)
    if (!message) return res.status(404).json({ error: 'Message not found' })

    const isAuthor = message.sender.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    await message.deleteOne()
    return res.json({ deleted: true })
  } catch (err) {
    console.error('[chat] delete error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})
