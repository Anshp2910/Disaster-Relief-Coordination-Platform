import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { escapeRegex } from '../utils/geo.js'
import { Request } from '../models/Request.js'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../../uploads')
fs.mkdirSync(uploadDir, { recursive: true })

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
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const allowedExt = /jpeg|jpg|png|gif|webp|pdf|doc|docx/
    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase())
    const mime = allowedMimes.includes(file.mimetype)
    cb(null, ext && mime)
  },
})

export const requestsRouter = express.Router()

requestsRouter.get('/', requireAuth, validateQuery(querySchemas.requestsList), async (req, res) => {
  try {
    const { page, limit, status, category, priority, search, sort } = req.query
    const filter = {}

    if (status && status !== 'All') filter.status = status
    if (category && category !== 'All') filter.category = category
    if (priority && priority !== 'All') filter.priority = priority
    if (search) {
      const safeSearch = escapeRegex(search)
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { locationName: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    const pageNum = Math.max(1, Number(req.query.page) || 1)
    const limitNum = limit || 20
    const sortStr = sort || '-createdAt'
    const skip = (pageNum - 1) * limitNum
    const [items, total] = await Promise.all([
      Request.find(filter)
        .select('title description locationName lat lng status category priority peopleCount files.url files.filename files.mimetype createdAt createdBy claimedBy escalated matchedResources')
        .sort(sortStr)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'displayName email role')
        .populate('claimedBy', 'displayName email role')
        .lean(),
      Request.countDocuments(filter),
    ])

    return res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    })
  } catch (err) {
    logger.error('[requests] list error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/', requireAuth, validate('createRequest'), async (req, res) => {
  try {
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
      location: { type: 'Point', coordinates: [lng, lat] },
      status: 'Open',
      category: category || 'Other',
      priority: priority || 'Medium',
      peopleCount: peopleCount || 1,
      createdBy: req.user._id,
      auditLog: [{ action: 'created', by: req.user._id }],
    })

    const populated = await item.populate('createdBy', 'displayName email role')

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:created', { item: populated })
      } catch (err) {
        logger.error('[ws] emit request:created error', { message: err.message })
      }
    }

    return res.status(201).json({ item: populated })
  } catch (err) {
    logger.error('[requests] create error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.get('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
      .populate('createdBy', 'displayName email role')
      .populate('claimedBy', 'displayName email role')
      .populate('comments.createdBy', 'displayName email role')
      .lean()
    if (!item) return res.status(404).json({ error: 'Not found' })
    return res.json({ item })
  } catch (err) {
    logger.error('[requests] get error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.put('/:id', requireAuth, validateObjectId('id'), validate('updateRequest'), async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    const isOwner = item.createdBy?.toString() === req.user._id?.toString()
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
    const newLat = lat !== undefined ? lat : item.lat
    const newLng = lng !== undefined ? lng : item.lng
    if (newLat != null && newLng != null) {
      item.location = { type: 'Point', coordinates: [newLng, newLat] }
    }
    if (status !== undefined) item.status = status
    if (category !== undefined) item.category = category
    if (priority !== undefined) item.priority = priority
    if (peopleCount !== undefined) item.peopleCount = peopleCount

    await item.save()
    const populated = await item.populate('createdBy', 'displayName email role')

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: populated })
      } catch (err) {
        logger.error('[ws] emit request:updated error', { message: err.message })
      }
    }

    return res.json({ item: populated })
  } catch (err) {
    logger.error('[requests] update error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.delete('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    const isOwner = item.createdBy.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    await item.deleteOne()

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:deleted', { id })
      } catch (err) {
        logger.error('[ws] emit request:deleted error', { message: err.message })
      }
    }

    return res.json({ deleted: true })
  } catch (err) {
    logger.error('[requests] delete error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/claim', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params

    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (['Resolved', 'Fulfilled'].includes(item.status)) {
      return res.status(400).json({ error: 'Cannot claim a completed request' })
    }

    const updated = await Request.findOneAndUpdate(
      { _id: id, claimedBy: null },
      { $set: { claimedBy: req.user._id, claimedAt: new Date() } },
      { new: true },
    )
    if (!updated) return res.status(400).json({ error: 'Already claimed' })

    if (updated.status === 'Open') updated.status = 'In Progress'
    updated.auditLog.push({ action: 'claimed', by: req.user._id })
    await updated.save()

    const populated = await updated.populate('createdBy', 'displayName email role')
    await populated.populate('claimedBy', 'displayName email role')

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: populated })
      } catch (err) {
        logger.error('[ws] emit request:updated error', { message: err.message })
      }
    }

    return res.json({ item: populated })
  } catch (err) {
    logger.error('[requests] claim error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/unclaim', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (['Resolved', 'Fulfilled'].includes(item.status)) return res.status(400).json({ error: 'Cannot unclaim a completed request' })

    const isClaimer = item.claimedBy && item.claimedBy.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isClaimer && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    item.claimedBy = null
    item.claimedAt = null
    if (item.status === 'In Progress') item.status = 'Open'
    item.auditLog.push({ action: 'unclaimed', by: req.user._id })
    await item.save()

    const populated = await item.populate('createdBy', 'displayName email role')

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: populated })
      } catch (err) {
        logger.error('[ws] emit request:updated error', { message: err.message })
      }
    }

    return res.json({ item: populated })
  } catch (err) {
    logger.error('[requests] unclaim error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/comments', requireAuth, validateObjectId('id'), validate('comment'), async (req, res) => {
  try {
    const { id } = req.params
    const { text } = req.body || {}
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text required' })

    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    item.comments.push({ text: text.trim(), createdBy: req.user._id })
    item.auditLog.push({ action: 'commented', by: req.user._id, details: text.trim().slice(0, 100) })
    await item.save()

    const populated = await item.populate('comments.createdBy', 'displayName email role')

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:commented', {
          requestId: id,
          comment: populated.comments[populated.comments.length - 1],
        })
      } catch (err) {
        logger.error('[ws] emit request:commented error', { message: err.message })
      }
    }

    return res.json({ comments: populated.comments })
  } catch (err) {
    logger.error('[requests] comment error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.delete('/:id/comments/:commentId', requireAuth, validateObjectId('id'), validateObjectId('commentId'), async (req, res) => {
  try {
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
  } catch (err) {
    logger.error('[requests] delete comment error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/files', requireAuth, validateObjectId('id'), async (req, res, next) => {
  const { id } = req.params
  const item = await Request.findById(id)
  if (!item) return res.status(404).json({ error: 'Not found' })

  if (item.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' })
  }
  req._item = item
  next()
}, upload.array('files', 5), async (req, res) => {
  try {
    const multerFiles = req.files || []
    if (multerFiles.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const newFiles = multerFiles.map((f) => ({
      url: `/uploads/${f.filename}`,
      filename: f.originalname,
      mimetype: f.mimetype,
      uploadedBy: req.user._id,
    }))

    req._item.files.push(...newFiles)
    req._item.auditLog.push({ action: 'filesUploaded', by: req.user._id, details: `${newFiles.length} file(s)` })
    await req._item.save()

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: { _id: req._item._id, files: req._item.files } })
      } catch (err) {
        logger.error('[ws] emit request:updated error', { message: err.message })
      }
    }

    return res.json({ files: req._item.files })
  } catch (err) {
    logger.error('[requests] file upload error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.delete('/:id/files/:fileId', requireAuth, validateObjectId('id'), validateObjectId('fileId'), async (req, res) => {
  try {
    const { id, fileId } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })

    const file = item.files.id(fileId)
    if (!file) return res.status(404).json({ error: 'File not found' })

    if (file.uploadedBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' })
    }

    item.files.pull(fileId)
    item.auditLog.push({ action: 'fileDeleted', by: req.user._id, details: file.filename || 'file' })
    await item.save()

    const io = req.app.get('io')
    if (io) {
      try { io.emit('request:updated', { item: { _id: id, files: item.files } }) } catch {}
    }

    return res.json({ files: item.files })
  } catch (err) {
    logger.error('[requests] file delete error', { message: err.message })
    return res.status(500).json({ error: 'Server error' })
  }
})
