import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../config/env.js'

const CSRF_SECRET = () => getJwtSecret()
const CSRF_COOKIE = 'csrf-token'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_LENGTH = 32
const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

/**
 * Parse cookies from the raw Cookie header string.
 * Avoids dependency on cookie-parser.
 */
function parseCookies(req) {
  const raw = req.headers?.cookie
  if (!raw) return {}
  const cookies = {}
  for (const pair of raw.split(';')) {
    const [key, ...rest] = pair.split('=')
    if (key) cookies[key.trim()] = rest.join('=').trim()
  }
  return cookies
}

/**
 * Generate a signed CSRF token and set it as a cookie.
 * The client must read the cookie and send the token back in the x-csrf-token header.
 * Only generated on GET requests to avoid setting cookies on every response.
 */
export function generateCsrfToken(req, res, next) {
  // Only generate on GET (safe) requests — state-changing requests will validate
  if (req.method === 'GET' || req.method === 'HEAD') {
    const raw = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
    const payload = { data: raw, exp: Date.now() + TOKEN_EXPIRY_MS }
    const signed = jwt.sign(payload, CSRF_SECRET(), { algorithm: 'HS256', expiresIn: '1h' })

    res.cookie(CSRF_COOKIE, signed, {
      httpOnly: false, // Client JS must read this cookie
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: TOKEN_EXPIRY_MS,
    })
    res.setHeader('X-CSRF-Token', signed)
  }
  next()
}

/**
 * Validate CSRF token on state-changing requests (POST, PUT, PATCH, DELETE).
 * Uses double-submit pattern: compare header value to cookie value.
 * Skips validation for JWT-authenticated requests (Authorization header).
 * Skips validation for public auth routes (login, register, forgot/reset password).
 */
export function validateCsrf(req, res, next) {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // Skip for JWT-authenticated requests — Bearer token provides CSRF protection
  // (attacker can't read the token cross-origin due to SameSite cookies)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  // Skip for public auth routes — client won't have a CSRF cookie yet on first visit
  if (req.path.startsWith('/api/auth/')) {
    return next()
  }

  // Skip for public endpoints (no auth required)
  if (req.path.startsWith('/api/public') || req.path.startsWith('/api/weather')) {
    return next()
  }

  const cookies = parseCookies(req)
  const headerToken = req.headers[CSRF_HEADER]
  const cookieToken = cookies[CSRF_COOKIE]

  if (!headerToken || !cookieToken) {
    return res.status(403).json({ error: 'CSRF token missing', code: 'CSRF_MISSING' })
  }

  if (headerToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF token mismatch', code: 'CSRF_MISMATCH' })
  }

  try {
    const decoded = jwt.verify(cookieToken, CSRF_SECRET(), { algorithms: ['HS256'] })
    if (!decoded.data || !decoded.exp || Date.now() > decoded.exp) {
      return res.status(403).json({ error: 'CSRF token expired', code: 'CSRF_EXPIRED' })
    }
  } catch {
    return res.status(403).json({ error: 'CSRF token invalid', code: 'CSRF_INVALID' })
  }

  next()
}
