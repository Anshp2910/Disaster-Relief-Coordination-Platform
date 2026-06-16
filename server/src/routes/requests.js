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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const ALLOWED_SORT_FIELDS = ['-createdAt', 'createdAt', '-priority', 'priority', '-status', 'status', 'title', '-title']

export const requestsRouter = express.Router()

requestsRouter.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, priority, search, sort = '-createdAt' } = req.query
    const filter = {}

    if (status && status !== 'All') filter.status = status
    if (category && category !== 'All') filter.category = category
    if (priority && priority !== 'All') filter.priority = priority
    if (search) {
      const safeSearch = escapeRegex(String(search))
      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { locationName: { $regex: safeSearch, $options: 'i' } },
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const sortStr = ALLOWED_SORT_FIELDS.includes(sort) ? sort : '-createdAt'
    const skip = (pageNum - 1) * limitNum
    const [items, total] = await Promise.all([
      Request.find(filter)
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
    console.error('[requests] list error:', err.message)
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
        console.error('[ws] emit request:created error:', err.message)
      }
    }

    return res.status(201).json({ item: populated })
  } catch (err) {
    console.error('[requests] create error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.get('/:id', requireAuth, async (req, res) => {
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
    console.error('[requests] get error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.put('/:id', requireAuth, validate('updateRequest'), async (req, res) => {
  try {
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
        console.error('[ws] emit request:updated error:', err.message)
      }
    }

    return res.json({ item: populated })
  } catch (err) {
    console.error('[requests] update error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.delete('/:id', requireAuth, async (req, res) => {
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
        console.error('[ws] emit request:deleted error:', err.message)
      }
    }

    return res.json({ deleted: true })
  } catch (err) {
    console.error('[requests] delete error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/claim', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const item = await Request.findById(id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    if (['Resolved', 'Fulfilled'].includes(item.status)) {
      return res.status(400).json({ error: 'Cannot claim a completed request' })
    }
    if (item.claimedBy) return res.status(400).json({ error: 'Already claimed' })

    item.claimedBy = req.user._id
    item.claimedAt = new Date()
    if (item.status === 'Open') item.status = 'In Progress'
    item.auditLog.push({ action: 'claimed', by: req.user._id })
    await item.save()

    const populated = await item.populate('createdBy', 'displayName email role')
    await populated.populate('claimedBy', 'displayName email role')

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: populated })
      } catch (err) {
        console.error('[ws] emit request:updated error:', err.message)
      }
    }

    return res.json({ item: populated })
  } catch (err) {
    console.error('[requests] claim error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/unclaim', requireAuth, async (req, res) => {
  try {
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

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: populated })
      } catch (err) {
        console.error('[ws] emit request:updated error:', err.message)
      }
    }

    return res.json({ item: populated })
  } catch (err) {
    console.error('[requests] unclaim error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/comments', requireAuth, validate('comment'), async (req, res) => {
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
        console.error('[ws] emit request:commented error:', err.message)
      }
    }

    return res.json({ comments: populated.comments })
  } catch (err) {
    console.error('[requests] comment error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
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
    console.error('[requests] delete comment error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

requestsRouter.post('/:id/files', requireAuth, (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message })
    }
    next()
  })
}, async (req, res) => {
  try {
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

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('request:updated', { item: { _id: id, files: item.files } })
      } catch (err) {
        console.error('[ws] emit request:updated error:', err.message)
      }
    }

    return res.json({ files: item.files })
  } catch (err) {
    console.error('[requests] file upload error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})
