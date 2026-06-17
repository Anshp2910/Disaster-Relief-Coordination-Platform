import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { User } from '../models/User.js'
import { Request } from '../models/Request.js'
import { Zone } from '../models/Zone.js'
import { Incident } from '../models/Incident.js'

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
    console.error('[admin] stats error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean()
    return res.json({ users })
  } catch (err) {
    console.error('[admin] users list error:', err.message)
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
    console.error('[admin] role update error:', err.message)
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

    await user.deleteOne()
    return res.json({ deleted: true })
  } catch (err) {
    console.error('[admin] user delete error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.delete('/requests/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    await item.deleteOne()
    return res.json({ deleted: true })
  } catch (err) {
    console.error('[admin] request delete error:', err.message)
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
      const csv = [headers.join(','), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=requests-export.csv')
      return res.send(csv)
    }

    return res.json({ items, total: items.length })
  } catch (err) {
    console.error('[admin] export error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

adminRouter.post('/seed-demo', async (req, res) => {
  try {
    const { seedDemo } = await import('../seed-demo.js')
    await seedDemo()
    const zoneCount = await Zone.countDocuments()
    const incidentCount = await Incident.countDocuments()
    const requestCount = await Request.countDocuments()
    return res.json({ message: 'Demo data seeded', zones: zoneCount, incidents: incidentCount, requests: requestCount })
  } catch (err) {
    console.error('[admin] seed-demo error:', err.message)
    return res.status(500).json({ error: 'Seed failed: ' + err.message })
  }
})
