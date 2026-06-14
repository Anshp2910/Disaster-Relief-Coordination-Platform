import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { Zone } from '../models/Zone.js'

export const geofencingRouter = express.Router()

geofencingRouter.get('/check', requireAuth, async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10 } = req.query
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' })

    const latitude = Number(lat)
    const longitude = Number(lng)
    const radius = Number(radiusKm)

    const zones = await Zone.find({ status: { $ne: 'Closed' } }).lean()
    const nearby = []

    for (const zone of zones) {
      if (zone.centerLat && zone.centerLng) {
        const dist = haversineKm(latitude, longitude, zone.centerLat, zone.centerLng)
        if (dist <= (zone.radiusKm || radius)) {
          nearby.push({ ...zone, distanceKm: Math.round(dist * 10) / 10 })
        }
      }
    }

    const requests = await Request.find({ lat: { $exists: true }, lng: { $exists: true } }).lean()
    const nearbyRequests = []
    for (const r of requests) {
      if (r.lat && r.lng) {
        const dist = haversineKm(latitude, longitude, r.lat, r.lng)
        if (dist <= radius) {
          nearbyRequests.push({ ...r, distanceKm: Math.round(dist * 10) / 10 })
        }
      }
    }

    const resources = await Resource.find({ lat: { $exists: true }, lng: { $exists: true } }).lean()
    const nearbyResources = []
    for (const r of resources) {
      if (r.lat && r.lng) {
        const dist = haversineKm(latitude, longitude, r.lat, r.lng)
        if (dist <= radius) {
          nearbyResources.push({ ...r, distanceKm: Math.round(dist * 10) / 10 })
        }
      }
    }

    res.json({
      zones: nearby,
      requests: nearbyRequests,
      resources: nearbyResources,
      center: { lat: latitude, lng: longitude },
      radiusKm: radius,
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
