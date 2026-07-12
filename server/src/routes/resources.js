import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { Resource } from '../models/Resource.js'
import { Request } from '../models/Request.js'
import { haversineKm, escapeRegex } from '../utils/geo.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated, sendBadRequest, sendNotFound, sendForbidden, sendServerError } from '../utils/response.js'

export const resourcesRouter = express.Router()

resourcesRouter.get('/', requireAuth, validateQuery(querySchemas.resourcesList), async (req, res) => {
  try {
    const { page = 1, category, status, search } = req.query
    const filter = {}
    if (category && category !== 'All') filter.category = category
    if (status && status !== 'All') filter.status = status
    if (search) {
      const safeSearch = escapeRegex(String(search))
      filter.$or = [{ name: { $regex: safeSearch, $options: 'i' } }, { locationName: { $regex: safeSearch, $options: 'i' } }]
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const skip = (Math.max(1, Number(page)) - 1) * limit
    const [items, total] = await Promise.all([
      Resource.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('allocatedTo', 'title status').populate('updatedBy', 'displayName email').lean(),
      Resource.countDocuments(filter),
    ])

    const summary = await Resource.aggregate([
      { $group: { _id: '$category', totalQty: { $sum: '$quantity' }, count: { $sum: 1 }, lowCount: { $sum: { $cond: [{ $in: ['$status', ['Low', 'Depleted']] }, 1, 0] } } } },
    ])

    return sendPaginated(res, { items, total, page: Number(page), pages: Math.ceil(total / limit), extra: { summary } })
  } catch (err) {
    logger.error('[resources] list error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.post('/', requireAuth, validate('createResource'), async (req, res) => {
  try {
    const { name, category, quantity, unit, locationName, lat, lng, notes } = req.body
    if (!name || !category || quantity == null || !unit || !locationName) {
      return sendBadRequest(res, 'Missing required fields')
    }
    if (quantity < 0) return sendBadRequest(res, 'Quantity must be non-negative')

    const status = quantity === 0 ? 'Depleted' : quantity <= 10 ? 'Low' : 'Available'
    const resourceData = { name, category, quantity, unit, locationName, notes, status, updatedBy: req.user._id }
    if (lat != null && lng != null) {
      resourceData.lat = lat
      resourceData.lng = lng
      resourceData.location = { type: 'Point', coordinates: [lng, lat] }
    }
    const resource = new Resource(resourceData)
    await resource.save()

    const io = req.app.get('io')
    if (io) {
      try { io.emit('resource:created', { item: resource }) } catch (err) { logger.error('[ws] emit error', { message: err.message }) }
    }

    return sendCreated(res, { item: resource })
  } catch (err) {
    logger.error('[resources] create error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.put('/:id', requireAuth, validateObjectId('id'), validate('updateResource'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return sendNotFound(res, 'Resource not found')

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendForbidden(res)

    const allowedFields = ['name', 'category', 'quantity', 'unit', 'locationName', 'lat', 'lng', 'notes', 'status']
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'quantity') {
          if (typeof req.body.quantity !== 'number' || isNaN(req.body.quantity)) return sendBadRequest(res, 'Invalid quantity')
          if (req.body.quantity < 0) return sendBadRequest(res, 'Quantity must be non-negative')
          resource.quantity = req.body.quantity
          if (req.body.quantity === 0) resource.status = 'Depleted'
          else if (req.body.quantity <= 10 && resource.status !== 'Reserved') resource.status = 'Low'
          else if (req.body.quantity > 10 && resource.status === 'Depleted') resource.status = 'Available'
        } else {
          resource[field] = req.body[field]
        }
      }
    }

    const newLat = req.body.lat !== undefined ? req.body.lat : resource.lat
    const newLng = req.body.lng !== undefined ? req.body.lng : resource.lng
    if (newLat != null && newLng != null) {
      resource.location = { type: 'Point', coordinates: [newLng, newLat] }
    }
    resource.updatedBy = req.user._id
    await resource.save()

    return sendSuccess(res, { data: { item: resource } })
  } catch (err) {
    logger.error('[resources] update error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.delete('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return sendNotFound(res, 'Resource not found')

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendForbidden(res)

    if (resource.allocatedTo) {
      resource.allocatedTo = null
      resource.allocatedQuantity = 0
      await resource.save()
    }
    await resource.deleteOne()

    return sendSuccess(res, { data: { ok: true } })
  } catch (err) {
    logger.error('[resources] delete error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.post('/:id/allocate', requireAuth, validateObjectId('id'), validate('allocateResource'), async (req, res) => {
  try {
    const { requestId, allocQuantity } = req.body
    if (!requestId || !allocQuantity || allocQuantity <= 0) {
      return sendBadRequest(res, 'requestId and allocQuantity required')
    }

    const resource = await Resource.findById(req.params.id)
    if (!resource) return sendNotFound(res, 'Resource not found')

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendForbidden(res)

    const request = await Request.findById(requestId).lean()
    if (!request) return sendNotFound(res, 'Request not found')

    const updated = await Resource.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: allocQuantity }, allocatedTo: null },
      { $inc: { quantity: -allocQuantity }, $set: { allocatedTo: requestId, allocatedQuantity: allocQuantity, updatedBy: req.user._id } },
      { new: true },
    )
    if (!updated) {
      const existing = await Resource.findById(req.params.id).lean()
      if (!existing) return sendNotFound(res)
      if (existing.quantity < allocQuantity) return sendBadRequest(res, 'Insufficient quantity')
      if (existing.allocatedTo) return sendBadRequest(res, 'Resource already allocated')
      return sendBadRequest(res, 'Allocation failed')
    }

    if (updated.quantity === 0) updated.status = 'Depleted'
    else if (updated.quantity <= 10) updated.status = 'Low'
    await updated.save()

    const io = req.app.get('io')
    if (io) {
      try { io.emit('resource:allocated', { resource: { _id: updated._id, name: updated.name }, requestId, allocQuantity }) } catch (err) { logger.error('[ws] emit error', { message: err.message }) }
    }

    return sendSuccess(res, { data: { item: updated } })
  } catch (err) {
    logger.error('[resources] allocate error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.post('/:id/deallocate', requireAuth, validateObjectId('id'), validate('deallocateResource'), async (req, res) => {
  try {
    const { deallocQuantity } = req.body
    if (!deallocQuantity || deallocQuantity <= 0) return sendBadRequest(res, 'deallocQuantity required')

    const resource = await Resource.findById(req.params.id)
    if (!resource) return sendNotFound(res)

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return sendForbidden(res)

    if (resource.allocatedQuantity < deallocQuantity) return sendBadRequest(res, 'Cannot deallocate more than allocated')

    resource.quantity += deallocQuantity
    resource.allocatedQuantity -= deallocQuantity
    if (resource.allocatedQuantity === 0) resource.allocatedTo = null
    resource.status = resource.quantity > 10 ? 'Available' : resource.quantity > 0 ? 'Low' : 'Depleted'
    resource.updatedBy = req.user._id
    await resource.save()

    return sendSuccess(res, { data: { item: resource } })
  } catch (err) {
    logger.error('[resources] deallocate error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.get('/match/:requestId', requireAuth, validateObjectId('requestId'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).lean()
    if (!request) return sendNotFound(res, 'Request not found')

    const { lat, lng, category } = request
    const MAX_DISTANCE_KM = 100
    const categoryMap = {
      Medical: ['Medical'], Food: ['Food'], Shelter: ['Shelter'], Water: ['Water'],
      Rescue: ['Supplies'], Supplies: ['Supplies'],
      Other: ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other'],
    }
    const matchedCategories = categoryMap[category] || ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other']

    let resources
    if (lat != null && lng != null) {
      try {
        resources = await Resource.find({
          category: { $in: matchedCategories },
          status: { $in: ['Available', 'Low'] },
          quantity: { $gt: 0 }, allocatedTo: null,
          'location.coordinates': { $exists: true, $ne: [] },
          location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: MAX_DISTANCE_KM * 1000 } },
        }).lean()
      } catch (geoErr) {
        logger.error('[resources] match geo fallback', { message: geoErr.message })
        resources = await Resource.find({ category: { $in: matchedCategories }, status: { $in: ['Available', 'Low'] }, quantity: { $gt: 0 }, allocatedTo: null }).lean()
        resources = resources.filter((r) => r.lat != null && r.lng != null && haversineKm(lat, lng, r.lat, r.lng) <= MAX_DISTANCE_KM)
      }
    } else {
      resources = await Resource.find({ category: { $in: matchedCategories }, status: { $in: ['Available', 'Low'] }, quantity: { $gt: 0 }, allocatedTo: null }).lean()
    }

    const scored = resources.map((r) => {
      let distance = Infinity
      if (lat != null && lng != null && r.lat != null && r.lng != null) distance = haversineKm(lat, lng, r.lat, r.lng)
      const categoryMatch = r.category === category ? 1 : 0.5
      const distanceScore = distance <= MAX_DISTANCE_KM ? 1 - distance / MAX_DISTANCE_KM : 0
      return { ...r, distanceKm: distance === Infinity ? null : Math.round(distance * 10) / 10, score: Math.round((categoryMatch * 0.6 + distanceScore * 0.4) * 100) / 100, categoryMatch: r.category === category }
    }).filter((r) => r.score > 0.1).sort((a, b) => b.score - a.score).slice(0, 10)

    return sendSuccess(res, { data: { matches: scored } })
  } catch (err) {
    logger.error('[resources] match error', { message: err.message })
    return sendServerError(res)
  }
})

resourcesRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await Resource.aggregate([
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } },
      { $group: { _id: '$_id.category', statuses: { $push: { status: '$_id.status', count: '$count', totalQty: '$totalQty' } }, totalCount: { $sum: '$count' }, totalQty: { $sum: '$totalQty' } } },
    ])
    return sendSuccess(res, { data: { stats } })
  } catch (err) {
    logger.error('[resources] stats error', { message: err.message })
    return sendServerError(res)
  }
})
