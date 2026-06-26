import { logger } from '../utils/logger.js'

export function requestLogger(req, res, next) {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id?.toString() || 'anonymous',
      ip: req.ip,
    })
  })
  next()
}
