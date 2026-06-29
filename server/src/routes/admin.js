import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { User } from '../models/User.js'
import { Request } from '../models/Request.js'
import { Zone } from '../models/Zone.js'
import { Incident } from '../models/Incident.js'
import { ChatMessage } from '../models/ChatMessage.js'
import { logger } from '../utils/logger.js'

export const escCsv = (v) => { const s = String(v).replace(/"/g, '""'); return /^[=+\-@|]/.test(s) ? `\t"${s}"` : `"${s}"` }

export const adminRouter = express.Router()

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalRequests, statusCounts, categoryCounts, priorityCounts, dailyRequests] = await Promise.all([
      User.countDocuments(),
      Request.countDocuments(),
      Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Request.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Request.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Request.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ])

    return res.json({
      totalUsers,
      totalRequests,
      byStatus: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      byCategory: Object.fromEntries(categoryCounts.map((c) => [c._id, c.count])),
      byPriority: Object.fromEntries(priorityCounts.map((p) => [p._id, p.count])),
      dailyRequests: dailyRequests.map((d) => ({ date: d._id, count: d.count })),
    })
  } catch (err) {
    logger.error('[admin] stats error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/users', validateQuery(querySchemas.adminUsersList), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)))
    const lim = Math.min(100, Math.max(1, Number(limit)))
    const [users, total] = await Promise.all([
      User.find()
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      User.countDocuments(),
    ])
    return res.json({ users, total, pages: Math.ceil(total / lim) })
  } catch (err) {
    logger.error('[admin] users list error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.put('/users/:id/role', validateObjectId('id'), validate('updateUserRole'), async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    const user = await User.findById(id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.role = role
    await user.save()
    return res.json({ user: { _id: user._id, email: user.email, displayName: user.displayName, role: user.role } })
  } catch (err) {
    logger.error('[admin] role update error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.delete('/users/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params
    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }

    const user = await User.findById(id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    await Promise.all([
      ChatMessage.deleteMany({ sender: id }),
      Request.updateMany({ createdBy: id }, { $set: { createdBy: null } }),
      Request.updateMany({ claimedBy: id }, { $set: { claimedBy: null } }),
    ])
    await user.deleteOne()
    return res.json({ deleted: true })
  } catch (err) {
    logger.error('[admin] user delete error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.delete('/requests/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    await ChatMessage.deleteMany({ requestId: id })
    await item.deleteOne()
    return res.json({ deleted: true })
  } catch (err) {
    logger.error('[admin] request delete error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/export/requests', validateQuery(querySchemas.adminExport), async (req, res) => {
  try {
    const { format = 'json' } = req.query
    const items = await Request.find()
      .populate('createdBy', 'displayName email role')
      .populate('claimedBy', 'displayName email role')
      .sort({ createdAt: -1 })
      .lean()

    if (format === 'csv') {
      const headers = ['Title', 'Description', 'Category', 'Priority', 'Status', 'Location', 'Lat', 'Lng', 'People', 'Posted By', 'Claimed By', 'Created At']
      const rows = items.map((r) => [
        r.title, r.description, r.category, r.priority, r.status, r.locationName,
        r.lat, r.lng, r.peopleCount || 1,
        r.createdBy?.displayName || r.createdBy?.email || '',
        r.claimedBy?.displayName || r.claimedBy?.email || '',
        r.createdAt,
      ])
      const csv = [headers.join(','), ...rows.map((row) => row.map(escCsv).join(','))].join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=requests-export.csv')
      return res.send(csv)
    }

    return res.json({ items, total: items.length })
  } catch (err) {
    logger.error('[admin] export error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/requests', validateQuery(querySchemas.requestsList), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, category, priority, sort } = req.query
    const filter = {}
    if (status && status !== 'All') filter.status = status
    if (category && category !== 'All') filter.category = category
    if (priority && priority !== 'All') filter.priority = priority
    if (search) {
      const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { locationName: { $regex: safeSearch, $options: 'i' } },
      ]
    }
    const sortStr = sort || '-createdAt'
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit) || 20))
    const lim = Math.min(100, Math.max(1, Number(limit) || 20))
    const [items, total] = await Promise.all([
      Request.find(filter)
        .populate('createdBy', 'displayName email')
        .populate('claimedBy', 'displayName email')
        .sort(sortStr)
        .skip(skip)
        .limit(lim)
        .lean(),
      Request.countDocuments(filter),
    ])
    return res.json({ items, total, pages: Math.ceil(total / lim) })
  } catch (err) {
    logger.error('[admin] requests list error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

let seedDemoFn = null

adminRouter.post('/seed-demo', async (req, res) => {
  try {
    if (!seedDemoFn) {
      const mod = await import('../seed-demo.js')
      seedDemoFn = mod.seedDemo
    }
    await seedDemoFn()
    const zoneCount = await Zone.countDocuments()
    const incidentCount = await Incident.countDocuments()
    const requestCount = await Request.countDocuments()
    return res.json({ message: 'Demo data seeded', zones: zoneCount, incidents: incidentCount, requests: requestCount })
  } catch (err) {
    logger.error('[admin] seed-demo error', { message: err.message })
    return res.status(500).json({ error: 'Seed failed: ' + err.message })
  }
})
