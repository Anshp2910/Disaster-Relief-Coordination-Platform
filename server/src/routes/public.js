import { Router } from 'express'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { Zone } from '../models/Zone.js'
import { Incident } from '../models/Incident.js'
import { SosAlert } from '../models/SosAlert.js'
import { logger } from '../utils/logger.js'
import { sendSuccess, sendServerError } from '../utils/response.js'

const router = Router()

router.get('/overview', async (req, res) => {
  try {
    const [activeRequests, totalResources, deployedResources, totalZones, activeIncidents, recentSOS, requestsByStatus] = await Promise.all([
      Request.countDocuments({ status: { $nin: ['Resolved', 'Closed'] } }),
      Resource.countDocuments(),
      Resource.countDocuments({ status: 'Deployed' }),
      Zone.countDocuments(),
      Incident.countDocuments({ status: { $ne: 'Resolved' } }),
      SosAlert.countDocuments({ status: { $ne: 'resolved' } }),
      Request.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ])

    const statusBreakdown = {}
    requestsByStatus.forEach((s) => { statusBreakdown[s._id] = s.count })

    return sendSuccess(res, {
      data: {
        activeRequests, totalResources, deployedResources,
        availableResources: totalResources - deployedResources,
        totalZones, activeIncidents, activeSOS: recentSOS,
        statusBreakdown, updatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('Public overview error', { message: err.message })
    return sendServerError(res, 'Failed to fetch overview')
  }
})

export default router
