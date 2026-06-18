const userBuckets = new Map()

const CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of userBuckets) {
    if (now - bucket.windowStart > CLEANUP_INTERVAL * 2) {
      userBuckets.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export function rateLimitUser({ windowMs = 60 * 1000, max = 60, message = 'Too many requests, please slow down' } = {}) {
  return (req, res, next) => {
    const userId = req.user?._id?.toString() || req.ip
    const key = `${userId}:${req.baseUrl}${req.path}`
    const now = Date.now()

    let bucket = userBuckets.get(key)
    if (!bucket || now - bucket.windowStart > windowMs) {
      bucket = { windowStart: now, count: 0 }
      userBuckets.set(key, bucket)
    }

    bucket.count++

    res.set({
      'X-RateLimit-Limit': String(max),
      'X-RateLimit-Remaining': String(Math.max(0, max - bucket.count)),
      'X-RateLimit-Reset': String(Math.ceil((bucket.windowStart + windowMs) / 1000)),
    })

    if (bucket.count > max) {
      return res.status(429).json({ error: message })
    }
    next()
  }
}
