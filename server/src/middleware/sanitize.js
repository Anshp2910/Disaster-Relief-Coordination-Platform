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
  if (req.query && typeof req.query === 'object') {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') req.query[k] = sanitizeString(v)
    }
  }
  if (req.params && typeof req.params === 'object') {
    for (const [k, v] of Object.entries(req.params)) {
      if (typeof v === 'string') req.params[k] = sanitizeString(v)
    }
  }
  next()
}
