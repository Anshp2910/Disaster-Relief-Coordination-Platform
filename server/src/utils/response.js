/**
 * Standardized API response helpers.
 *
 * All route handlers should use these functions to ensure every response
 * has a consistent envelope shape:
 *
 *   Success: { success: true, data: ..., meta: { ... } }
 *   Error:   { success: false, error: "...", code: "..." }
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.status=200] HTTP status code
 * @param {*}      options.data     Primary payload
 * @param {object} [options.meta]   Optional metadata (pagination, counts, etc.)
 */
export function sendSuccess(res, { status = 200, data, meta }) {
  const body = { success: true, data }
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

/**
 * Send a paginated list response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {Array}  options.items
 * @param {number} options.total
 * @param {number} options.page
 * @param {number} options.pages
 * @param {object} [options.extra]  Extra fields to merge into meta
 */
export function sendPaginated(res, { items, total, page, pages, extra }) {
  const meta = { total, page, pages, count: items.length }
  if (extra) Object.assign(meta, extra)
  return sendSuccess(res, { data: items, meta })
}

/**
 * Send a 201 Created response.
 * @param {import('express').Response} res
 * @param {*} data
 */
export function sendCreated(res, data) {
  return sendSuccess(res, { status: 201, data })
}

/**
 * Send a success with no body content (204).
 * @param {import('express').Response} res
 */
export function sendNoContent(res) {
  return res.status(204).end()
}

/* ------------------------------------------------------------------ */
/*  Error helpers                                                      */
/* ------------------------------------------------------------------ */

const ERROR_CODES = {
  BAD_REQUEST:     'BAD_REQUEST',
  VALIDATION:      'VALIDATION_ERROR',
  NOT_FOUND:       'NOT_FOUND',
  FORBIDDEN:       'FORBIDDEN',
  UNAUTHORIZED:    'UNAUTHORIZED',
  CONFLICT:        'CONFLICT',
  RATE_LIMIT:      'RATE_LIMIT',
  SERVER_ERROR:    'SERVER_ERROR',
  SERVICE_UNAVAIL: 'SERVICE_UNAVAILABLE',
}

export { ERROR_CODES }

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} options.status   HTTP status code
 * @param {string} options.error    Human-readable message
 * @param {string} [options.code]   Machine-readable error code
 * @param {Array}  [options.details] Optional validation error details
 */
export function sendError(res, { status, error, code, details }) {
  const body = { success: false, error }
  if (code) body.code = code
  if (details) body.details = details
  return res.status(status).json(body)
}

// Convenience helpers
export const sendBadRequest    = (res, msg, details) => sendError(res, { status: 400, error: msg, code: ERROR_CODES.BAD_REQUEST, details })
export const sendUnauthorized  = (res, msg = 'Authentication required') => sendError(res, { status: 401, error: msg, code: ERROR_CODES.UNAUTHORIZED })
export const sendForbidden     = (res, msg = 'Forbidden') => sendError(res, { status: 403, error: msg, code: ERROR_CODES.FORBIDDEN })
export const sendNotFound      = (res, msg = 'Resource not found') => sendError(res, { status: 404, error: msg, code: ERROR_CODES.NOT_FOUND })
export const sendConflict      = (res, msg) => sendError(res, { status: 409, error: msg, code: ERROR_CODES.CONFLICT })
export const sendTooMany       = (res, msg = 'Too many requests, please slow down') => sendError(res, { status: 429, error: msg, code: ERROR_CODES.RATE_LIMIT })
export const sendServerError   = (res, msg = 'Internal server error') => sendError(res, { status: 500, error: msg, code: ERROR_CODES.SERVER_ERROR })
