import { Incident } from '../models/Incident.js'
import { Zone } from '../models/Zone.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { logger } from '../utils/logger.js'
import { escapeRegex } from '../utils/geo.js'

export async function list(req, res) {
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
        const center = z.location?.coordinates?.length === 2 ? [z.location.coordinates[0], z.location.coordinates[1]] : [z.centerLng, z.centerLat]

        let zoneRequests = []
        let zoneResources = []

        try {
          ;[zoneRequests, zoneResources] = await Promise.all([
            Request.find({
              'location.coordinates': { $exists: true, $ne: [] },
              location: { $geoWithin: { $centerSphere: [center, radiusMeters / 6371000] } },
            }).select('status').lean(),
            Resource.find({
              'location.coordinates': { $exists: true, $ne: [] },
              location: { $geoWithin: { $centerSphere: [center, radiusMeters / 6371000] } },
            }).select('quantity').lean(),
          ])
        } catch (geoErr) {
          logger.error('[incidents] geo fallback', { message: geoErr.message })
          const allR = await Request.find({}).select('lat lng status').lean()
          const allRes = await Resource.find({}).select('lat lng quantity').lean()
          zoneRequests = allR.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (z.radiusKm || 10))
          zoneResources = allRes.filter((r) => r.lat != null && r.lng != null && haversineKm(center[1], center[0], r.lat, r.lng) <= (z.radiusKm || 10))
        }

        requestCount += zoneRequests.length
        openRequests += zoneRequests.filter((r) => r.status === 'Open').length
        resourceCount += zoneResources.length
      }

      return { ...inc, stats: { requestCount, openRequests, resourceCount } }
    }))

    res.json({ items: enriched, total, pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    logger.error('[incidents] list error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
}

export async function get(req, res) {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('zones', 'name severity status centerLat centerLng radiusKm')
      .populate('createdBy', 'displayName email')
      .lean()
    if (!incident) return res.status(404).json({ error: 'Incident not found' })
    res.json({ item: incident })
  } catch (err) {
    logger.error('[incidents] get error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
}

export async function create(req, res) {
  try {
    const { name, description, disasterType, severity, status, zones, startDate, affectedPopulation, centerLat, centerLng } = req.body
    const incident = new Incident({ name, description, disasterType, severity, status, zones, startDate, affectedPopulation, centerLat, centerLng, createdBy: req.user._id })
    incident.auditLog.push({ action: 'created', by: req.user._id })
    await incident.save()
    return res.status(201).json({ item: incident })
  } catch (err) {
    logger.error('[incidents] create error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
}

export async function update(req, res) {
  try {
    const incident = await Incident.findById(req.params.id)
    if (!incident) return res.status(404).json({ error: 'Incident not found' })

    const fields = ['name', 'description', 'disasterType', 'severity', 'status', 'zones', 'endDate', 'affectedPopulation', 'centerLat', 'centerLng']
    const changes = []
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        changes.push(`${f}: ${JSON.stringify(incident[f])} -> ${JSON.stringify(req.body[f])}`)
        incident[f] = req.body[f]
      }
    }
    incident.auditLog.push({ action: 'updated', by: req.user._id, details: changes.join('; ') || 'updated' })
    await incident.save()
    return res.json({ item: incident })
  } catch (err) {
    logger.error('[incidents] update error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
}

export async function remove(req, res) {
  try {
    const incident = await Incident.findById(req.params.id)
    if (!incident) return res.status(404).json({ error: 'Incident not found' })
    incident.auditLog.push({ action: 'deleted', by: req.user._id, details: incident.name })
    await incident.save()
    await incident.deleteOne()
    return res.json({ ok: true })
  } catch (err) {
    logger.error('[incidents] delete error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
}
