import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { Zone } from '../models/Zone.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { haversineKm, escapeRegex } from '../utils/geo.js'
import { logger } from '../utils/logger.js'

export const zonesRouter = express.Router()

zonesRouter.get('/', requireAuth, validateQuery(querySchemas.zonesList), async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, status, disasterType, search } = req.query
    const filter = {}
    if (severity && severity !== 'All') filter.severity = severity
    if (status && status !== 'All') filter.status = status
    if (disasterType && disasterType !== 'All') filter.disasterType = disasterType
    if (search) {
      const safeSearch = escapeRegex(String(search))
      filter.$or = [{ name: { $regex: safeSearch, $options: 'i' } }, { description: { $regex: safeSearch, $options: 'i' } }]
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [paginatedItems, total] = await Promise.all([
      Zone.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).populate('createdBy', 'displayName email').lean(),
      Zone.countDocuments(filter),
    ])

    const zonesWithStats = await Promise.all(paginatedItems.map(async (zone) => {
      const radiusMeters = (zone.radiusKm || 10) * 1000
      const center = zone.location?.coordinates?.length === 2 ? [zone.location.coordinates[0], zone.location.coordinates[1]] : [zone.centerLng, zone.centerLat]

      let requestsInRange = []
      let resourcesInRange = []

      try {
        ;[requestsInRange, resourcesInRange] = await Promise.all([
          Request.find({
            'location.coordinates': { $exists: true, $ne: [] },
            location: {
              $geoWithin: {
                $centerSphere: [center, radiusMeters / 6371000],
              },
            },
          }).select('lat lng status category priority').lean(),
          Resource.find({
            'location.coordinates': { $exists: true, $ne: [] },
            location: {
              $geoWithin: {
                $centerSphere: [center, radiusMeters / 6371000],
              },
            },
          }).select('lat lng category quantity status').lean(),
        ])
      } catch (geoErr) {
        logger.error('[zones] geo query fallback', { message: geoErr.message })
        const allR = await Request.find({}).select('lat lng status category priority').lean()
        const allRes = await Resource.find({}).select('lat lng category quantity status').lean()
        requestsInRange = allR.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (zone.radiusKm || 10))
        resourcesInRange = allRes.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (zone.radiusKm || 10))
      }

      const openRequests = requestsInRange.filter((r) => r.status === 'Open').length
      const totalResources = resourcesInRange.reduce((sum, r) => sum + (r.quantity || 0), 0)
      const lowResources = resourcesInRange.filter((r) => r.status === 'Low' || r.status === 'Depleted').length

      let coverageStatus = 'Covered'
      if (openRequests > 0 && totalResources === 0) coverageStatus = 'Gap'
      else if (openRequests > 0 && totalResources > 0) coverageStatus = 'Partial'

      return {
        ...zone,
        stats: {
          requestCount: requestsInRange.length,
          openRequests,
          resourceCount: resourcesInRange.length,
          totalResources,
          lowResources,
          coverageStatus,
        },
      }
    }))

    res.json({ items: zonesWithStats, total, pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    logger.error('[zones] list error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.get('/heatmap', requireAuth, async (req, res) => {
  try {
    const zones = await Zone.find({ status: { $in: ['Active', 'Monitoring'] } }).lean()

    const heatData = await Promise.all(zones.map(async (zone) => {
      const radiusMeters = (zone.radiusKm || 10) * 1000
      const center = zone.location?.coordinates?.length === 2 ? [zone.location.coordinates[0], zone.location.coordinates[1]] : [zone.centerLng, zone.centerLat]

      let requests = []
      let resources = []

      try {
        ;[requests, resources] = await Promise.all([
          Request.find({
            'location.coordinates': { $exists: true, $ne: [] },
            location: {
              $geoWithin: {
                $centerSphere: [center, radiusMeters / 6371000],
              },
            },
          }).select('lat lng status').lean(),
          Resource.find({
            'location.coordinates': { $exists: true, $ne: [] },
            location: {
              $geoWithin: {
                $centerSphere: [center, radiusMeters / 6371000],
              },
            },
          }).select('lat lng category quantity status').lean(),
        ])
      } catch (geoErr) {
        logger.error('[zones] heatmap geo fallback', { message: geoErr.message })
        const allR = await Request.find({}).select('lat lng status').lean()
        const allRes = await Resource.find({}).select('lat lng category quantity status').lean()
        requests = allR.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (zone.radiusKm || 10))
        resources = allRes.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (zone.radiusKm || 10))
      }

      const openCount = requests.filter((r) => r.status === 'Open').length
      const totalRes = resources.reduce((sum, r) => sum + (r.quantity || 0), 0)
      const hasGaps = openCount > 0 && totalRes === 0

      return {
        _id: zone._id,
        name: zone.name,
        centerLat: zone.centerLat,
        centerLng: zone.centerLng,
        radiusKm: zone.radiusKm,
        severity: zone.severity,
        disasterType: zone.disasterType,
        affectedPopulation: zone.affectedPopulation,
        openRequests: openCount,
        totalResources: totalRes,
        hasGaps,
        coverageStatus: hasGaps ? 'Gap' : openCount > 0 ? 'Partial' : 'Covered',
      }
    }))

    res.json({ zones: heatData })
  } catch (err) {
    logger.error('[zones] heatmap error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.get('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).populate('createdBy', 'displayName email').lean()
    if (!zone) return res.status(404).json({ error: 'Zone not found' })

    const radiusMeters = (zone.radiusKm || 10) * 1000
    const center = zone.location?.coordinates?.length === 2 ? [zone.location.coordinates[0], zone.location.coordinates[1]] : [zone.centerLng, zone.centerLat]

    let requestsInRange = []
    let resourcesInRange = []

    try {
      ;[requestsInRange, resourcesInRange] = await Promise.all([
        Request.find({
          'location.coordinates': { $exists: true, $ne: [] },
          location: {
            $geoWithin: {
              $centerSphere: [center, radiusMeters / 6371000],
            },
          },
        }).select('lat lng status category priority title').lean(),
        Resource.find({
          'location.coordinates': { $exists: true, $ne: [] },
          location: {
            $geoWithin: {
              $centerSphere: [center, radiusMeters / 6371000],
            },
          },
        }).select('lat lng category quantity status name unit').lean(),
      ])
    } catch (geoErr) {
      logger.error('[zones] detail geo fallback', { message: geoErr.message })
      const allR = await Request.find({}).select('lat lng status category priority title').lean()
      const allRes = await Resource.find({}).select('lat lng category quantity status name unit').lean()
      requestsInRange = allR.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (zone.radiusKm || 10))
      resourcesInRange = allRes.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (zone.radiusKm || 10))
    }

    res.json({
      item: zone,
      stats: {
        requests: requestsInRange,
        resources: resourcesInRange,
        requestCount: requestsInRange.length,
        openRequests: requestsInRange.filter((r) => r.status === 'Open').length,
        resourceCount: resourcesInRange.length,
        totalResources: resourcesInRange.reduce((sum, r) => sum + (r.quantity || 0), 0),
      },
    })
  } catch (err) {
    logger.error('[zones] get error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.post('/', requireAuth, requireAdmin, validate('createZone'), async (req, res) => {
  try {
    const { name, description, centerLat, centerLng, radiusKm, severity, status, disasterType, affectedPopulation, notes } = req.body
    const zone = new Zone({
      name, description, centerLat, centerLng, radiusKm, severity, status, disasterType, affectedPopulation, notes,
      location: { type: 'Point', coordinates: [centerLng, centerLat] },
      createdBy: req.user._id,
    })
    await zone.save()
    return res.status(201).json({ item: zone })
  } catch (err) {
    logger.error('[zones] create error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.put('/:id', requireAuth, requireAdmin, validateObjectId('id'), validate('updateZone'), async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
    if (!zone) return res.status(404).json({ error: 'Zone not found' })

    const fields = ['name', 'description', 'centerLat', 'centerLng', 'radiusKm', 'severity', 'status', 'disasterType', 'affectedPopulation', 'notes']
    for (const f of fields) {
      if (req.body[f] !== undefined) zone[f] = req.body[f]
    }
    if (req.body.centerLat !== undefined && req.body.centerLng !== undefined) {
      zone.location = { type: 'Point', coordinates: [req.body.centerLng, req.body.centerLat] }
    } else if (req.body.centerLat !== undefined && zone.centerLng != null) {
      zone.location = { type: 'Point', coordinates: [zone.centerLng, req.body.centerLat] }
    } else if (req.body.centerLng !== undefined && zone.centerLat != null) {
      zone.location = { type: 'Point', coordinates: [req.body.centerLng, zone.centerLat] }
    }
    await zone.save()
    return res.json({ item: zone })
  } catch (err) {
    logger.error('[zones] update error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.delete('/:id', requireAuth, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
    if (!zone) return res.status(404).json({ error: 'Zone not found' })
    await zone.deleteOne()
    return res.json({ ok: true })
  } catch (err) {
    logger.error('[zones] delete error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})
