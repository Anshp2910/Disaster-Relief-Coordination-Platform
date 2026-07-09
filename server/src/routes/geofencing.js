import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validateQuery, querySchemas } from '../middleware/validate.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { Zone } from '../models/Zone.js'
import { haversineKm } from '../utils/geo.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendServerError } from '../utils/response.js'

export const geofencingRouter = express.Router()

geofencingRouter.get('/check', requireAuth, validateQuery(querySchemas.geofencingCheck), async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query
    const radiusMeters = radiusKm * 1000
    const sphereRadius = radiusMeters / 6371000

    let zones = [], requests = [], resources = []

    try {
      zones = await Zone.find({ status: { $ne: 'Closed' }, 'location.coordinates': { $exists: true, $ne: [] }, location: { $geoWithin: { $centerSphere: [[lng, lat], sphereRadius] } } }).lean()
    } catch (e) {
      logger.error('[geofencing] zone query fallback', { message: e.message })
      const allZones = await Zone.find({ status: { $ne: 'Closed' } }).lean()
      zones = allZones.filter((z) => z.centerLat != null && z.centerLng != null && haversineKm(lat, lng, z.centerLat, z.centerLng) <= radiusKm)
        .map((z) => ({ ...z, distanceKm: Math.round(haversineKm(lat, lng, z.centerLat, z.centerLng) * 10) / 10 }))
    }

    try {
      requests = await Request.find({ 'location.coordinates': { $exists: true, $ne: [] }, location: { $geoWithin: { $centerSphere: [[lng, lat], sphereRadius] } } }).lean()
    } catch (e) {
      logger.error('[geofencing] request query fallback', { message: e.message })
      const allRequests = await Request.find({}).lean()
      requests = allRequests.filter((r) => r.lat != null && r.lng != null && haversineKm(lat, lng, r.lat, r.lng) <= radiusKm)
        .map((r) => ({ ...r, distanceKm: Math.round(haversineKm(lat, lng, r.lat, r.lng) * 10) / 10 }))
    }

    try {
      resources = await Resource.find({ 'location.coordinates': { $exists: true, $ne: [] }, location: { $geoWithin: { $centerSphere: [[lng, lat], sphereRadius] } } }).lean()
    } catch (e) {
      logger.error('[geofencing] resource query fallback', { message: e.message })
      const allResources = await Resource.find({}).lean()
      resources = allResources.filter((r) => r.lat != null && r.lng != null && haversineKm(lat, lng, r.lat, r.lng) <= radiusKm)
        .map((r) => ({ ...r, distanceKm: Math.round(haversineKm(lat, lng, r.lat, r.lng) * 10) / 10 }))
    }

    const addDistance = (items, latFn, lngFn) => items.map((item) => {
      if (item.distanceKm != null) return item
      const ilat = latFn(item)
      const ilng = lngFn(item)
      const dist = haversineKm(lat, lng, ilat, ilng)
      return { ...item, distanceKm: Math.round(dist * 10) / 10 }
    })

    return sendSuccess(res, {
      data: {
        zones: addDistance(zones, (z) => z.centerLat ?? z.lat, (z) => z.centerLng ?? z.lng),
        requests: addDistance(requests, (r) => r.lat, (r) => r.lng),
        resources: addDistance(resources, (r) => r.lat, (r) => r.lng),
        center: { lat, lng }, radiusKm,
      },
    })
  } catch (err) {
    logger.error('[geofencing] check error', { message: err.message })
    return sendServerError(res)
  }
})
