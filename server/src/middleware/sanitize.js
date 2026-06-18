function sanitizeString(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function sanitizeValue(val) {
  if (typeof val === 'string') return sanitizeString(val)
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (val && typeof val === 'object') {
    const clean = {}
    for (const [k, v] of Object.entries(val)) {
      clean[k] = sanitizeValue(v)
    }
    return clean
  }
  return val
}

export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body)
  }
  next()
}
