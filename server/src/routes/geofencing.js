import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validateQuery, querySchemas } from '../middleware/validate.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { Zone } from '../models/Zone.js'

export const geofencingRouter = express.Router()

geofencingRouter.get('/check', requireAuth, validateQuery(querySchemas.geofencingCheck), async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query
    const radiusMeters = radiusKm * 1000

    const [zones, requests, resources] = await Promise.all([
      Zone.find({
        status: { $ne: 'Closed' },
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusMeters / 6371000],
          },
        },
      }).lean(),
      Request.find({
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusMeters / 6371000],
          },
        },
      }).lean(),
      Resource.find({
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusMeters / 6371000],
          },
        },
      }).lean(),
    ])

    const nearby = zones.map((zone) => {
      const center = zone.location?.coordinates ? [zone.location.coordinates[0], zone.location.coordinates[1]] : [zone.centerLng, zone.centerLat]
      const dist = haversineKm(lat, lng, center[1], center[0])
      return { ...zone, distanceKm: Math.round(dist * 10) / 10 }
    })

    const nearbyRequests = requests.map((r) => {
      const dist = haversineKm(lat, lng, r.lat, r.lng)
      return { ...r, distanceKm: Math.round(dist * 10) / 10 }
    })

    const nearbyResources = resources.map((r) => {
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
    console.error('[geofencing] check error:', err.message)
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
