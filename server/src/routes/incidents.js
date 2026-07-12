import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../middleware/validate.js'
import { Incident } from '../models/Incident.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { haversineKm, escapeRegex } from '../utils/geo.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendCreated, sendPaginated, sendNotFound, sendForbidden, sendServerError } from '../utils/response.js'

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
      Incident.find(filter).sort({ startDate: -1 }).skip(skip).limit(Number(limit))
        .populate('zones', 'name severity status centerLat centerLng radiusKm location')
        .populate('createdBy', 'displayName email').lean(),
      Incident.countDocuments(filter),
    ])

    const enriched = await Promise.all(items.map(async (inc) => {
      const zones = inc.zones || []
      let requestCount = 0, openRequests = 0, resourceCount = 0
      for (const z of zones) {
        const radiusMeters = (z.radiusKm || 10) * 1000
        const center = z.location?.coordinates?.length === 2 ? [z.location.coordinates[0], z.location.coordinates[1]] : [z.centerLng, z.centerLat]
        let zoneRequests = [], zoneResources = []
        try {
          ;[zoneRequests, zoneResources] = await Promise.all([
            Request.find({ 'location.coordinates': { $exists: true, $ne: [] }, location: { $geoWithin: { $centerSphere: [center, radiusMeters / 6371000] } } }).select('status').lean(),
            Resource.find({ 'location.coordinates': { $exists: true, $ne: [] }, location: { $geoWithin: { $centerSphere: [center, radiusMeters / 6371000] } } }).select('quantity').lean(),
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

    return sendPaginated(res, { items: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)) })
  } catch (err) {
    logger.error('[incidents] list error', { message: err.message })
    return sendServerError(res)
  }
})

incidentsRouter.get('/:id', requireAuth, validateObjectId('id'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('zones', 'name severity status centerLat centerLng radiusKm')
      .populate('createdBy', 'displayName email').lean()
    if (!incident) return sendNotFound(res, 'Incident not found')
    return sendSuccess(res, { data: { item: incident } })
  } catch (err) {
    logger.error('[incidents] get error', { message: err.message })
    return sendServerError(res)
  }
})

incidentsRouter.post('/', requireAuth, requireAdmin, validate('createIncident'), async (req, res) => {
  try {
    const { name, description, disasterType, severity, status, zones, startDate, affectedPopulation, centerLat, centerLng } = req.body
    const incident = new Incident({ name, description, disasterType, severity, status, zones, startDate, affectedPopulation, centerLat, centerLng, createdBy: req.user._id })
    incident.auditLog.push({ action: 'created', by: req.user._id })
    await incident.save()
    return sendCreated(res, { item: incident })
  } catch (err) {
    logger.error('[incidents] create error', { message: err.message })
    return sendServerError(res)
  }
})

incidentsRouter.put('/:id', requireAuth, requireAdmin, validateObjectId('id'), validate('updateIncident'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
    if (!incident) return sendNotFound(res, 'Incident not found')

    const allowedFields = ['name', 'description', 'disasterType', 'severity', 'status', 'zones', 'endDate', 'affectedPopulation', 'centerLat', 'centerLng']
    const changes = []
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        changes.push(`${f}: ${JSON.stringify(incident[f])} → ${JSON.stringify(req.body[f])}`)
        incident[f] = req.body[f]
      }
    }
    incident.auditLog.push({ action: 'updated', by: req.user._id, details: changes.join('; ') || 'updated' })
    await incident.save()
    return sendSuccess(res, { data: { item: incident } })
  } catch (err) {
    logger.error('[incidents] update error', { message: err.message })
    return sendServerError(res)
  }
})

incidentsRouter.delete('/:id', requireAuth, requireAdmin, validateObjectId('id'), async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
    if (!incident) return sendNotFound(res, 'Incident not found')
  logger.info('[audit] incident deleted', { incidentId: incident._id, name: incident.name, by: req.user._id, timestamp: new Date().toISOString() })
  await incident.deleteOne()
    return sendSuccess(res, { data: { ok: true } })
  } catch (err) {
    logger.error('[incidents] delete error', { message: err.message })
    return sendServerError(res)
  }
})
