import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { Zone } from '../models/Zone.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'

export const zonesRouter = express.Router()

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

zonesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, status, disasterType, search } = req.query
    const filter = {}
    if (severity && severity !== 'All') filter.severity = severity
    if (status && status !== 'All') filter.status = status
    if (disasterType && disasterType !== 'All') filter.disasterType = disasterType
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
    const [items, total] = await Promise.all([
      Zone.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).populate('createdBy', 'displayName email'),
      Zone.countDocuments(filter),
    ])

    const allZones = await Zone.find({ status: { $in: ['Active', 'Monitoring'] } })
    const allRequests = await Request.find({}).select('lat lng status category priority')
    const allResources = await Resource.find({}).select('lat lng category quantity status')

    const zonesWithStats = allZones.map((zone) => {
      const requestsInRange = allRequests.filter(
        (r) => r.lat && r.lng && haversineKm(zone.centerLat, zone.centerLng, r.lat, r.lng) <= zone.radiusKm,
      )
      const resourcesInRange = allResources.filter(
        (r) => r.lat && r.lng && haversineKm(zone.centerLat, zone.centerLng, r.lat, r.lng) <= zone.radiusKm,
      )

      const openRequests = requestsInRange.filter((r) => r.status === 'Open').length
      const totalResources = resourcesInRange.reduce((sum, r) => sum + (r.quantity || 0), 0)
      const lowResources = resourcesInRange.filter((r) => r.status === 'Low' || r.status === 'Depleted').length

      let coverageStatus = 'Covered'
      if (openRequests > 0 && totalResources === 0) coverageStatus = 'Gap'
      else if (openRequests > 0 && totalResources > 0) coverageStatus = 'Partial'

      return {
        ...zone.toObject(),
        stats: {
          requestCount: requestsInRange.length,
          openRequests,
          resourceCount: resourcesInRange.length,
          totalResources,
          lowResources,
          coverageStatus,
        },
      }
    })

    res.json({ items: zonesWithStats, total, pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    console.error('[zones] list error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.get('/heatmap', requireAuth, async (req, res) => {
  try {
    const zones = await Zone.find({ status: { $in: ['Active', 'Monitoring'] } })
    const requests = await Request.find({}).select('lat lng status category priority')
    const resources = await Resource.find({}).select('lat lng category quantity status')

    const heatData = zones.map((zone) => {
      const reqs = requests.filter(
        (r) => r.lat && r.lng && haversineKm(zone.centerLat, zone.centerLng, r.lat, r.lng) <= zone.radiusKm,
      )
      const res = resources.filter(
        (r) => r.lat && r.lng && haversineKm(zone.centerLat, zone.centerLng, r.lat, r.lng) <= zone.radiusKm,
      )

      const openCount = reqs.filter((r) => r.status === 'Open').length
      const totalRes = res.reduce((sum, r) => sum + (r.quantity || 0), 0)
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
    })

    res.json({ zones: heatData })
  } catch (err) {
    console.error('[zones] heatmap error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).populate('createdBy', 'displayName email')
    if (!zone) return res.status(404).json({ error: 'Zone not found' })

    const requests = await Request.find({}).select('lat lng status category priority title')
    const resources = await Resource.find({}).select('lat lng category quantity status name unit')

    const requestsInRange = requests.filter(
      (r) => r.lat && r.lng && haversineKm(zone.centerLat, zone.centerLng, r.lat, r.lng) <= zone.radiusKm,
    )
    const resourcesInRange = resources.filter(
      (r) => r.lat && r.lng && haversineKm(zone.centerLat, zone.centerLng, r.lat, r.lng) <= zone.radiusKm,
    )

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
    console.error('[zones] get error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.post('/', requireAuth, requireAdmin, validate('createZone'), async (req, res) => {
  try {
    const { name, description, centerLat, centerLng, radiusKm, severity, status, disasterType, affectedPopulation, notes } = req.body
    const zone = new Zone({
      name, description, centerLat, centerLng, radiusKm, severity, status, disasterType, affectedPopulation, notes,
      createdBy: req.user._id,
    })
    await zone.save()
    return res.status(201).json({ item: zone })
  } catch (err) {
    console.error('[zones] create error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.put('/:id', requireAuth, requireAdmin, validate('updateZone'), async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
    if (!zone) return res.status(404).json({ error: 'Zone not found' })

    const fields = ['name', 'description', 'centerLat', 'centerLng', 'radiusKm', 'severity', 'status', 'disasterType', 'affectedPopulation', 'notes']
    for (const f of fields) {
      if (req.body[f] !== undefined) zone[f] = req.body[f]
    }
    await zone.save()
    return res.json({ item: zone })
  } catch (err) {
    console.error('[zones] update error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

zonesRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
    if (!zone) return res.status(404).json({ error: 'Zone not found' })
    await zone.deleteOne()
    return res.json({ ok: true })
  } catch (err) {
    console.error('[zones] delete error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})
