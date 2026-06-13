import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Request } from '../models/Request.js'

export const requestsRouter = express.Router()

requestsRouter.get('/', requireAuth, async (req, res) => {
  const items = await Request.find()
    .sort({ createdAt: -1 })
    .populate('createdBy', 'displayName email role')
    .lean()
  return res.json({ items })
})

requestsRouter.post('/', requireAuth, async (req, res) => {
  const { title, description, locationName, lat, lng, status, category, priority } = req.body || {}
  if (!title || !description || !locationName || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const item = await Request.create({
    title,
    description,
    locationName,
    lat,
    lng,
    status: status || 'Open',
    category: category || 'Other',
    priority: priority || 'Medium',
    createdBy: req.user._id,
  })

  const populated = await item.populate('createdBy', 'displayName email role')
  return res.status(201).json({ item: populated })
})

requestsRouter.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
    .populate('createdBy', 'displayName email role')
    .lean()
  if (!item) return res.status(404).json({ error: 'Not found' })
  return res.json({ item })
})

requestsRouter.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  const isOwner = item.createdBy.toString() === req.user._id.toString()
  const isAdmin = req.user.role === 'admin'
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  const { title, description, locationName, lat, lng, status, category, priority } = req.body || {}
  if (title !== undefined) item.title = title
  if (description !== undefined) item.description = description
  if (locationName !== undefined) item.locationName = locationName
  if (lat !== undefined) item.lat = lat
  if (lng !== undefined) item.lng = lng
  if (status !== undefined) item.status = status
  if (category !== undefined) item.category = category
  if (priority !== undefined) item.priority = priority

  await item.save()
  const populated = await item.populate('createdBy', 'displayName email role')
  return res.json({ item: populated })
})

requestsRouter.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  const isOwner = item.createdBy.toString() === req.user._id.toString()
  const isAdmin = req.user.role === 'admin'
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  await item.deleteOne()
  return res.json({ deleted: true })
})
