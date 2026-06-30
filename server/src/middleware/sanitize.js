const DANGEROUS_PATTERNS = [
  { regex: /<script[\s>]/gi, replacement: '<blocked-script>' },
  { regex: /<\/script\s*>/gi, replacement: '' },
  { regex: /javascript\s*:/gi, replacement: 'blocked-javascript:' },
  { regex: /on\w+\s*=/gi, replacement: 'blocked-event=' },
  { regex: /data\s*:\s*text\s*\/\s*html/gi, replacement: 'blocked-data:' },
  { regex: /expression\s*\(/gi, replacement: 'blocked-expression(' },
  { regex: /eval\s*\(/gi, replacement: 'blocked-eval(' },
  { regex: /document\.cookie/gi, replacement: 'blocked-cookie' },
  { regex: /<iframe[\s>]/gi, replacement: '<blocked-iframe>' },
  { regex: /<object[\s>]/gi, replacement: '<blocked-object>' },
  { regex: /<embed[\s>]/gi, replacement: '<blocked-embed>' },
  { regex: /<svg[\s>]/gi, replacement: '<blocked-svg>' },
]

/**
 * Decode HTML entities so encoded XSS payloads like &#60;script are caught.
 * Handles numeric (&#60;, &#x3C;) and common named entities.
 */
function decodeHtmlEntities(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
}

function stripDangerous(str) {
  if (typeof str !== 'string') return str
  // Decode HTML entities repeatedly to catch double-encoding
  // e.g. &amp;#60; → &#60; → < → caught by pattern
  let result = str
  let iterations = 0
  let decoded = decodeHtmlEntities(result)
  // Loop until no more decoding occurs, max 5 iterations to prevent abuse
  while (decoded !== result && iterations < 5) {
    result = decoded
    decoded = decodeHtmlEntities(result)
    iterations++
  }
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
