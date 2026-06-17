import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { Schedule } from '../models/Schedule.js'
import { Zone } from '../models/Zone.js'

export const schedulesRouter = express.Router()

schedulesRouter.get('/', requireAuth, validateQuery(querySchemas.schedulesList), async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, zoneId, status, startDate, endDate } = req.query
    const filter = {}
    if (userId) filter.userId = userId
    if (zoneId) filter.zoneId = zoneId
    if (status && status !== 'All') filter.status = status
    if (startDate) filter.endDate = { $gte: new Date(startDate) }
    if (endDate) filter.startDate = { $lte: new Date(endDate) }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [items, total] = await Promise.all([
      Schedule.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'displayName email role skills')
        .populate('zoneId', 'name severity disasterType')
        .lean(),
      Schedule.countDocuments(filter),
    ])
    res.json({ items, total, pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    console.error('[schedules] list error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

schedulesRouter.post('/', requireAuth, validate('createSchedule'), async (req, res) => {
  try {
    let targetUserId = req.user._id
    if (req.body.userId && req.user.role === 'admin') {
      targetUserId = req.body.userId
    }
    const schedule = new Schedule({
      ...req.body,
      userId: targetUserId,
    })
    await schedule.save()
    const populated = await schedule.populate('userId', 'displayName email role skills')
    return res.status(201).json({ item: populated })
  } catch (err) {
    console.error('[schedules] create error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

schedulesRouter.put('/:id', requireAuth, validateObjectId('id'), validate('updateSchedule'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' })

    const isOwner = schedule.userId?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    const fields = ['startDate', 'endDate', 'shift', 'skills', 'status', 'notes']
    for (const f of fields) {
      if (req.body[f] !== undefined) schedule[f] = req.body[f]
    }
    await schedule.save()
    const populated = await schedule.populate('userId', 'displayName email role skills')
    return res.json({ item: populated })
  } catch (err) {
    console.error('[schedules] update error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

schedulesRouter.delete('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' })

    const isOwner = schedule.userId?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    await schedule.deleteOne()
    return res.json({ ok: true })
  } catch (err) {
    console.error('[schedules] delete error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})
