const DANGEROUS_PATTERNS = [
  { regex: /<script[\s>]/gi, replacement: '<blocked-script>' },
  { regex: /<\/script\s*>/gi, replacement: '' },
  { regex: /javascript\s*:/gi, replacement: 'blocked-javascript:' },
  { regex: /on\w+\s*=/gi, replacement: 'blocked-event=' },
  { regex: /data\s*:\s*text\s*\/\s*html/gi, replacement: 'blocked-data:' },
  { regex: /expression\s*\(/gi, replacement: 'blocked-expression(' },
]

function stripDangerous(str) {
  if (typeof str !== 'string') return str
  let result = str
  for (const { regex, replacement } of DANGEROUS_PATTERNS) {
    result = result.replace(regex, replacement)
  }
  return result
}

function sanitizeValue(val) {
  if (typeof val === 'string') return stripDangerous(val)
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (val && typeof val === 'object') {
    const clean = {}
    for (const [k, v] of Object.entries(val)) {
      clean[stripDangerous(k)] = sanitizeValue(v)
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
      if (typeof v === 'string') req.query[k] = stripDangerous(v)
    }
  }
  if (req.params && typeof req.params === 'object') {
    for (const [k, v] of Object.entries(req.params)) {
      if (typeof v === 'string') req.params[k] = stripDangerous(v)
    }
  }
  next()
}
