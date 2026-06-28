import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validateQuery, querySchemas } from '../middleware/validate.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { Zone } from '../models/Zone.js'
import { haversineKm } from '../utils/geo.js'
import { logger } from '../utils/logger.js'

export const geofencingRouter = express.Router()

geofencingRouter.get('/check', requireAuth, validateQuery(querySchemas.geofencingCheck), async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query
    const radiusMeters = radiusKm * 1000
    const sphereRadius = radiusMeters / 6371000

    let zones = []
    let requests = []
    let resources = []

    try {
      zones = await Zone.find({
        status: { $ne: 'Closed' },
        'location.coordinates': { $exists: true, $ne: [] },
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], sphereRadius],
          },
        },
      }).lean()
    } catch (e) {
      logger.error('[geofencing] zone query fallback', { message: e.message })
      const allZones = await Zone.find({ status: { $ne: 'Closed' } }).lean()
      zones = allZones.filter((z) => {
        if (z.centerLat == null || z.centerLng == null) return false
        const dist = haversineKm(lat, lng, z.centerLat, z.centerLng)
        return dist <= radiusKm
      }).map((z) => ({ ...z, distanceKm: Math.round(haversineKm(lat, lng, z.centerLat, z.centerLng) * 10) / 10 }))
    }

    try {
      requests = await Request.find({
        'location.coordinates': { $exists: true, $ne: [] },
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], sphereRadius],
          },
        },
      }).lean()
    } catch (e) {
      logger.error('[geofencing] request query fallback', { message: e.message })
      const allRequests = await Request.find({}).lean()
      requests = allRequests.filter((r) => {
        if (r.lat == null || r.lng == null) return false
        const dist = haversineKm(lat, lng, r.lat, r.lng)
        return dist <= radiusKm
      }).map((r) => ({ ...r, distanceKm: Math.round(haversineKm(lat, lng, r.lat, r.lng) * 10) / 10 }))
    }

    try {
      resources = await Resource.find({
        'location.coordinates': { $exists: true, $ne: [] },
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], sphereRadius],
          },
        },
      }).lean()
    } catch (e) {
      logger.error('[geofencing] resource query fallback', { message: e.message })
      const allResources = await Resource.find({}).lean()
      resources = allResources.filter((r) => {
        if (r.lat == null || r.lng == null) return false
        const dist = haversineKm(lat, lng, r.lat, r.lng)
        return dist <= radiusKm
      }).map((r) => ({ ...r, distanceKm: Math.round(haversineKm(lat, lng, r.lat, r.lng) * 10) / 10 }))
    }

    const nearby = zones.map((zone) => {
      if (zone.distanceKm != null) return zone
      const center = zone.location?.coordinates?.length === 2 ? [zone.location.coordinates[0], zone.location.coordinates[1]] : [zone.centerLng, zone.centerLat]
      const dist = haversineKm(lat, lng, center[1], center[0])
      return { ...zone, distanceKm: Math.round(dist * 10) / 10 }
    })

    const nearbyRequests = requests.map((r) => {
      if (r.distanceKm != null) return r
      const dist = haversineKm(lat, lng, r.lat, r.lng)
      return { ...r, distanceKm: Math.round(dist * 10) / 10 }
    })

    const nearbyResources = resources.map((r) => {
      if (r.distanceKm != null) return r
      const dist = haversineKm(lat, lng, r.lat, r.lng)
      return { ...r, distanceKm: Math.round(dist * 10) / 10 }
    })

    res.json({
      zones: nearby,
      requests: nearbyRequests,
      resources: nearbyResources,
      center: { lat, lng },
      radiusKm,
    })
  } catch (err) {
    logger.error('[geofencing] check error', { message: err.message })
    res.status(500).json({ error: 'Server error' })
  }
})
