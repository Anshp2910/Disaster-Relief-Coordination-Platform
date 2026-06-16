import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Resource } from '../models/Resource.js'
import { Request } from '../models/Request.js'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const resourcesRouter = express.Router()

resourcesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status, search } = req.query
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
      Resource.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('allocatedTo', 'title status').populate('updatedBy', 'displayName email'),
      Resource.countDocuments(filter),
    ])

    const summary = await Resource.aggregate([
      { $group: { _id: '$category', totalQty: { $sum: '$quantity' }, count: { $sum: 1 }, lowCount: { $sum: { $cond: [{ $in: ['$status', ['Low', 'Depleted']] }, 1, 0] } } } },
    ])

    res.json({ items, total, pages: Math.ceil(total / Number(limit)), summary })
  } catch (err) {
    console.error('[resources] list error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.post('/', requireAuth, validate('createResource'), async (req, res) => {
  try {
    const { name, category, quantity, unit, locationName, lat, lng, notes } = req.body
    if (!name || !category || quantity == null || !unit || !locationName) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (quantity < 0) return res.status(400).json({ error: 'Quantity must be non-negative' })

    const status = quantity === 0 ? 'Depleted' : quantity <= 10 ? 'Low' : 'Available'
    const resourceData = { name, category, quantity, unit, locationName, lat, lng, notes, status, updatedBy: req.user._id }
    if (lat != null && lng != null) {
      resourceData.location = { type: 'Point', coordinates: [lng, lat] }
    }
    const resource = new Resource(resourceData)
    await resource.save()

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('resource:created', { item: resource })
      } catch (err) {
        console.error('[ws] emit resource:created error:', err.message)
      }
    }

    return res.status(201).json({ item: resource })
  } catch (err) {
    console.error('[resources] create error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.put('/:id', requireAuth, validate('updateResource'), async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    const { name, category, quantity, unit, locationName, lat, lng, notes } = req.body
    if (name !== undefined) resource.name = name
    if (category !== undefined) resource.category = category
    if (quantity !== undefined) {
      if (quantity < 0) return res.status(400).json({ error: 'Quantity must be non-negative' })
      resource.quantity = quantity
      if (quantity === 0) resource.status = 'Depleted'
      else if (quantity <= 10 && resource.status !== 'Reserved') resource.status = 'Low'
      else if (quantity > 10 && resource.status === 'Depleted') resource.status = 'Available'
    }
    if (unit !== undefined) resource.unit = unit
    if (locationName !== undefined) resource.locationName = locationName
    if (lat !== undefined) resource.lat = lat
    if (lng !== undefined) resource.lng = lng
    const newLat = lat !== undefined ? lat : resource.lat
    const newLng = lng !== undefined ? lng : resource.lng
    if (newLat != null && newLng != null) {
      resource.location = { type: 'Point', coordinates: [newLng, newLat] }
    }
    if (notes !== undefined) resource.notes = notes
    resource.updatedBy = req.user._id

    await resource.save()
    return res.json({ item: resource })
  } catch (err) {
    console.error('[resources] update error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    if (resource.allocatedTo) {
      resource.allocatedTo = null
      resource.allocatedQuantity = 0
      await resource.save()
    }

    await resource.deleteOne()
    return res.json({ ok: true })
  } catch (err) {
    console.error('[resources] delete error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.post('/:id/allocate', requireAuth, validate('allocateResource'), async (req, res) => {
  try {
    const { requestId, allocQuantity } = req.body
    if (!requestId || !allocQuantity || allocQuantity <= 0) {
      return res.status(400).json({ error: 'requestId and allocQuantity required' })
    }

    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    if (resource.quantity < allocQuantity) return res.status(400).json({ error: 'Insufficient quantity' })

    const request = await Request.findById(requestId)
    if (!request) return res.status(404).json({ error: 'Request not found' })

    resource.quantity -= allocQuantity
    resource.allocatedQuantity += allocQuantity
    resource.allocatedTo = requestId
    resource.status = resource.quantity === 0 ? 'Depleted' : resource.quantity <= 10 ? 'Low' : resource.status
    resource.updatedBy = req.user._id

    await resource.save()

    const io = req.app.get('io')
    if (io) {
      try {
        io.emit('resource:allocated', {
          resource: { _id: resource._id, name: resource.name },
          requestId,
          allocQuantity,
        })
      } catch (err) {
        console.error('[ws] emit resource:allocated error:', err.message)
      }
    }

    return res.json({ item: resource })
  } catch (err) {
    console.error('[resources] allocate error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.post('/:id/deallocate', requireAuth, validate('deallocateResource'), async (req, res) => {
  try {
    const { deallocQuantity } = req.body
    if (!deallocQuantity || deallocQuantity <= 0) {
      return res.status(400).json({ error: 'deallocQuantity required' })
    }

    const resource = await Resource.findById(req.params.id)
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const isOwner = resource.updatedBy?.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })

    if (resource.allocatedQuantity < deallocQuantity) return res.status(400).json({ error: 'Cannot deallocate more than allocated' })

    resource.quantity += deallocQuantity
    resource.allocatedQuantity -= deallocQuantity
    if (resource.allocatedQuantity === 0) resource.allocatedTo = null
    resource.status = resource.quantity > 10 ? 'Available' : resource.quantity > 0 ? 'Low' : 'Depleted'
    resource.updatedBy = req.user._id

    await resource.save()
    return res.json({ item: resource })
  } catch (err) {
    console.error('[resources] deallocate error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.get('/match/:requestId', requireAuth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).lean()
    if (!request) return res.status(404).json({ error: 'Request not found' })

    const { lat, lng, category } = request
    const MAX_DISTANCE_KM = 100

    const categoryMap = {
      Medical: ['Medical'],
      Food: ['Food'],
      Shelter: ['Shelter'],
      Water: ['Water'],
      Rescue: ['Supplies'],
      Supplies: ['Supplies'],
      Other: ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other'],
    }

    const matchedCategories = categoryMap[category] || ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other']

    let resources
    if (lat != null && lng != null) {
      resources = await Resource.find({
        category: { $in: matchedCategories },
        status: { $in: ['Available', 'Low'] },
        quantity: { $gt: 0 },
        allocatedTo: null,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: MAX_DISTANCE_KM * 1000,
          },
        },
      }).lean()
    } else {
      resources = await Resource.find({
        category: { $in: matchedCategories },
        status: { $in: ['Available', 'Low'] },
        quantity: { $gt: 0 },
        allocatedTo: null,
      }).lean()
    }

    const scored = resources
      .map((r) => {
        let distance = Infinity
        if (lat != null && lng != null && r.lat != null && r.lng != null) {
          distance = haversineKm(lat, lng, r.lat, r.lng)
        }
        const categoryMatch = r.category === category ? 1 : 0.5
        const distanceScore = distance <= MAX_DISTANCE_KM ? 1 - distance / MAX_DISTANCE_KM : 0
        const score = categoryMatch * 0.6 + distanceScore * 0.4

        return {
          ...r,
          distanceKm: distance === Infinity ? null : Math.round(distance * 10) / 10,
          score: Math.round(score * 100) / 100,
          categoryMatch: r.category === category,
        }
      })
      .filter((r) => r.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    return res.json({ matches: scored })
  } catch (err) {
    console.error('[resources] match error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

resourcesRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await Resource.aggregate([
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 }, totalQty: { $sum: '$quantity' } } },
      { $group: { _id: '$_id.category', statuses: { $push: { status: '$_id.status', count: '$count', totalQty: '$totalQty' } }, totalCount: { $sum: '$count' }, totalQty: { $sum: '$totalQty' } } },
    ])
    res.json({ stats })
  } catch (err) {
    console.error('[resources] stats error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})
