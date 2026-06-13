import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { Request } from '../models/Request.js'

export const adminRouter = express.Router()

adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/stats', async (req, res) => {
  const [totalUsers, totalRequests, statusCounts, categoryCounts, priorityCounts] = await Promise.all([
    User.countDocuments(),
    Request.countDocuments(),
    Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Request.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Request.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
  ])

  return res.json({
    totalUsers,
    totalRequests,
    byStatus: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
    byCategory: Object.fromEntries(categoryCounts.map((c) => [c._id, c.count])),
    byPriority: Object.fromEntries(priorityCounts.map((p) => [p._id, p.count])),
  })
})

adminRouter.get('/users', async (req, res) => {
  const users = await User.find()
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean()
  return res.json({ users })
})

adminRouter.put('/users/:id/role', async (req, res) => {
  const { id } = req.params
  const { role } = req.body || {}
  if (!['volunteer', 'ngo', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const user = await User.findById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  user.role = role
  await user.save()
  return res.json({ user: { _id: user._id, email: user.email, displayName: user.displayName, role: user.role } })
})

adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params
  if (id === req.user._id.toString()) {
    return res.status(400).json({ error: 'Cannot delete yourself' })
  }

  const user = await User.findById(id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  await user.deleteOne()
  return res.json({ deleted: true })
})

adminRouter.delete('/requests/:id', async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  await item.deleteOne()
  return res.json({ deleted: true })
})
