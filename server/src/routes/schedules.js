import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { Schedule } from '../models/Schedule.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated, sendNotFound, sendForbidden, sendServerError } from '../utils/response.js'

export const schedulesRouter = express.Router()

schedulesRouter.get('/', requireAuth, validateQuery(querySchemas.schedulesList), async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, zoneId, status, startDate, endDate } = req.query
    const filter = {}
    if (userId) filter.userId = userId
    if (zoneId) filter.zoneId = zoneId
    if (status && status !== 'All') filter.status = status
    if (startDate) filter.startDate = { $gte: new Date(startDate) }
    if (endDate) filter.endDate = { $lte: new Date(endDate) }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [items, total] = await Promise.all([
      Schedule.find(filter).sort({ startDate: -1 }).skip(skip).limit(Number(limit))
        .populate('userId', 'displayName email role skills')
        .populate('zoneId', 'name severity disasterType').lean(),
      Schedule.countDocuments(filter),
    ])
    return sendPaginated(res, { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    logger.error('[schedules] list error', { message: err.message })
    return sendServerError(res)
  }
})

schedulesRouter.post('/', requireAuth, validate('createSchedule'), async (req, res) => {
  try {
    let targetUserId = req.user._id
    if (req.body.userId && req.user.role === 'admin') targetUserId = req.body.userId
    const { zoneId, startDate, endDate, shift, skills, notes } = req.body
    const schedule = new Schedule({ zoneId, startDate, endDate, shift, skills, notes, userId: targetUserId })
    await schedule.save()
    const populated = await schedule.populate('userId', 'displayName email role skills')
    return sendCreated(res, { item: populated })
  } catch (err) {
    logger.error('[schedules] create error', { message: err.message })
    return sendServerError(res)
  }
})

schedulesRouter.put('/:id', requireAuth, validateObjectId('id'), validate('updateSchedule'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return sendNotFound(res, 'Schedule not found')

    const isOwner = schedule.userId?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendForbidden(res)

    const allowedFields = ['startDate', 'endDate', 'shift', 'skills', 'status', 'notes']
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) schedule[f] = req.body[f]
    }
    await schedule.save()
    const populated = await schedule.populate('userId', 'displayName email role skills')
    return sendSuccess(res, { data: { item: populated } })
  } catch (err) {
    logger.error('[schedules] update error', { message: err.message })
    return sendServerError(res)
  }
})

schedulesRouter.delete('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return sendNotFound(res, 'Schedule not found')

    const isOwner = schedule.userId?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendForbidden(res)

    await schedule.deleteOne()
    const io = req.app.get('io')
    if (io) {
      try { io.emit('schedule:deleted', { scheduleId: req.params.id }) } catch (err) { logger.error('[ws] emit error', { message: err.message }) }
    }
    return sendSuccess(res, { data: { ok: true } })
  } catch (err) {
    logger.error('[schedules] delete error', { message: err.message })
    return sendServerError(res)
  }
})
