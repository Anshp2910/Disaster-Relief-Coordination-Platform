import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { Incident } from '../models/Incident.js'
import { Zone } from '../models/Zone.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const incidentsRouter = express.Router()

incidentsRouter.get('/', requireAuth, validateQuery(querySchemas.incidentsList), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, severity, disasterType, search } = req.query
    const filter = {}
    if (status && status !== 'All') filter.status = status
    if (severity && severity !== 'All') filter.severity = severity
    if (disasterType && disasterType !== 'All') filter.disasterType = disasterType
    if (search) {
      const safeSearch = escapeRegex(String(search))
      filter.$or = [{ name: { $regex: safeSearch, $options: 'i' } }, { description: { $regex: safeSearch, $options: 'i' } }]
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [items, total] = await Promise.all([
      Incident.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('zones', 'name severity status centerLat centerLng radiusKm location')
        .populate('createdBy', 'displayName email')
        .lean(),
      Incident.countDocuments(filter),
    ])

    const enriched = await Promise.all(items.map(async (inc) => {
      const zones = inc.zones || []
      let requestCount = 0
      let openRequests = 0
      let resourceCount = 0

      for (const z of zones) {
        const radiusMeters = (z.radiusKm || 10) * 1000
        const center = z.location?.coordinates ? [z.location.coordinates[0], z.location.coordinates[1]] : [z.centerLng, z.centerLat]

        const [requests, resources] = await Promise.all([
          Request.find({
            location: {
              $geoWithin: {
                $centerSphere: [center, radiusMeters / 6371000],
              },
            },
          }).select('status').lean(),
          Resource.find({
            location: {
              $geoWithin: {
                $centerSphere: [center, radiusMeters / 6371000],
              },
            },
          }).select('quantity').lean(),
        ])

        requestCount += requests.length
        openRequests += requests.filter((r) => r.status === 'Open').length
        resourceCount += resources.length
      }

      return { ...inc, stats: { requestCount, openRequests, resourceCount } }
    }))

    res.json({ items: enriched, total, pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    console.error('[incidents] list error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

incidentsRouter.get('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('zones', 'name severity status centerLat centerLng radiusKm')
      .populate('createdBy', 'displayName email')
      .lean()
    if (!incident) return res.status(404).json({ error: 'Incident not found' })
    res.json({ item: incident })
  } catch (err) {
    console.error('[incidents] get error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

incidentsRouter.post('/', requireAuth, requireAdmin, validate('createIncident'), async (req, res) => {
  try {
    const incident = new Incident({ ...req.body, createdBy: req.user._id })
    await incident.save()
    return res.status(201).json({ item: incident })
  } catch (err) {
    console.error('[incidents] create error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

incidentsRouter.put('/:id', requireAuth, requireAdmin, validateObjectId('id'), validate('updateIncident'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
    if (!incident) return res.status(404).json({ error: 'Incident not found' })

    const fields = ['name', 'description', 'disasterType', 'severity', 'status', 'zones', 'endDate', 'affectedPopulation', 'centerLat', 'centerLng']
    for (const f of fields) {
      if (req.body[f] !== undefined) incident[f] = req.body[f]
    }
    await incident.save()
    return res.json({ item: incident })
  } catch (err) {
    console.error('[incidents] update error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

incidentsRouter.delete('/:id', requireAuth, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
    if (!incident) return res.status(404).json({ error: 'Incident not found' })
    await incident.deleteOne()
    return res.json({ ok: true })
  } catch (err) {
    console.error('[incidents] delete error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
