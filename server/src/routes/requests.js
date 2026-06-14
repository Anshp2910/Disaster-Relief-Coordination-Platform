import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Request } from '../models/Request.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../../uploads')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx/
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    const mime = allowed.test(file.mimetype) || file.mimetype.startsWith('application/')
    cb(null, ext || mime)
  },
})

export const requestsRouter = express.Router()

requestsRouter.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 20, status, category, priority, search, sort = '-createdAt' } = req.query
  const filter = {}

  if (status && status !== 'All') filter.status = status
  if (category && category !== 'All') filter.category = category
  if (priority && priority !== 'All') filter.priority = priority
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { locationName: { $regex: search, $options: 'i' } },
    ]
  }

  const skip = (Number(page) - 1) * Number(limit)
  const [items, total] = await Promise.all([
    Request.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'displayName email role')
      .populate('claimedBy', 'displayName email role')
      .lean(),
    Request.countDocuments(filter),
  ])

  return res.json({
    items,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  })
})

requestsRouter.post('/', requireAuth, validate('createRequest'), async (req, res) => {
  const { title, description, locationName, lat, lng, status, category, priority, peopleCount } = req.body || {}
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
    peopleCount: peopleCount || 1,
    createdBy: req.user._id,
    auditLog: [{ action: 'created', by: req.user._id }],
  })

  const populated = await item.populate('createdBy', 'displayName email role')
  return res.status(201).json({ item: populated })
})

requestsRouter.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
    .populate('createdBy', 'displayName email role')
    .populate('claimedBy', 'displayName email role')
    .populate('comments.createdBy', 'displayName email role')
    .lean()
  if (!item) return res.status(404).json({ error: 'Not found' })
  return res.json({ item })
})

requestsRouter.put('/:id', requireAuth, validate('updateRequest'), async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  const isOwner = item.createdBy.toString() === req.user._id.toString()
  const isAdmin = req.user.role === 'admin'
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  const { title, description, locationName, lat, lng, status, category, priority, peopleCount } = req.body || {}

  if (status !== undefined && status !== item.status) {
    item.auditLog.push({ action: `status:${item.status}->${status}`, by: req.user._id })
  }
  if (priority !== undefined && priority !== item.priority) {
    item.auditLog.push({ action: `priority:${item.priority}->${priority}`, by: req.user._id })
  }

  if (title !== undefined) item.title = title
  if (description !== undefined) item.description = description
  if (locationName !== undefined) item.locationName = locationName
  if (lat !== undefined) item.lat = lat
  if (lng !== undefined) item.lng = lng
  if (status !== undefined) item.status = status
  if (category !== undefined) item.category = category
  if (priority !== undefined) item.priority = priority
  if (peopleCount !== undefined) item.peopleCount = peopleCount

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

requestsRouter.post('/:id/claim', requireAuth, async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  if (item.claimedBy) return res.status(400).json({ error: 'Already claimed' })

  item.claimedBy = req.user._id
  item.claimedAt = new Date()
  if (item.status === 'Open') item.status = 'In Progress'
  item.auditLog.push({ action: 'claimed', by: req.user._id })
  await item.save()

  const populated = await item.populate('createdBy', 'displayName email role')
  await populated.populate('claimedBy', 'displayName email role')
  return res.json({ item: populated })
})

requestsRouter.post('/:id/unclaim', requireAuth, async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  const isClaimer = item.claimedBy && item.claimedBy.toString() === req.user._id.toString()
  const isAdmin = req.user.role === 'admin'
  if (!isClaimer && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  item.claimedBy = null
  item.claimedAt = null
  item.auditLog.push({ action: 'unclaimed', by: req.user._id })
  await item.save()

  const populated = await item.populate('createdBy', 'displayName email role')
  return res.json({ item: populated })
})

requestsRouter.post('/:id/comments', requireAuth, validate('comment'), async (req, res) => {
  const { id } = req.params
  const { text } = req.body || {}
  if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text required' })

  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  item.comments.push({ text: text.trim(), createdBy: req.user._id })
  item.auditLog.push({ action: 'commented', by: req.user._id, details: text.trim().slice(0, 100) })
  await item.save()

  const populated = await item.populate('comments.createdBy', 'displayName email role')
  return res.json({ comments: populated.comments })
})

requestsRouter.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const { id, commentId } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  const comment = item.comments.id(commentId)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })

  const isAuthor = comment.createdBy.toString() === req.user._id.toString()
  const isAdmin = req.user.role === 'admin'
  if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

  comment.deleteOne()
  await item.save()

  return res.json({ deleted: true })
})

requestsRouter.post('/:id/files', requireAuth, upload.array('files', 5), async (req, res) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' })
  }

  const newFiles = req.files.map((f) => ({
    url: `/uploads/${f.filename}`,
    filename: f.filename,
    mimetype: f.mimetype,
    uploadedBy: req.user._id,
  }))

  item.files.push(...newFiles)
  item.auditLog.push({ action: 'filesUploaded', by: req.user._id, details: `${req.files.length} file(s)` })
  await item.save()

  return res.json({ files: item.files })
})
