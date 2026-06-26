import { describe, it, expect, vi } from 'vitest'
import { sanitizeBody } from '../src/middleware/sanitize.js'
import { validate, validateObjectId, validateQuery, querySchemas } from '../src/middleware/validate.js'
import { rateLimitUser } from '../src/middleware/rateLimitUser.js'

describe('health endpoint', () => {
  it('returns { ok: true }', () => {
    const handler = (req, res) => res.json({ ok: true })
    const json = vi.fn()
    handler(null, { json })
    expect(json).toHaveBeenCalledWith({ ok: true })
  })
})

describe('validateObjectId middleware', () => {
  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })

  it('passes through with a valid 24-hex ObjectId', () => {
    const req = { params: { id: '507f1f77bcf86cd799439011' } }
    const res = makeRes()
    const next = vi.fn()

    validateObjectId('id')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects an invalid ObjectId format', () => {
    const req = { params: { id: 'not-an-object-id' } }
    const res = makeRes()
    const next = vi.fn()

    validateObjectId('id')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id format' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a short hex string', () => {
    const req = { params: { id: 'abc123' } }
    const res = makeRes()
    const next = vi.fn()

    validateObjectId('id')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('uses the given param name in the error', () => {
    const req = { params: { userId: 'bad' } }
    const res = makeRes()
    const next = vi.fn()

    validateObjectId('userId')(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid userId format' })
  })
})

describe('validate body middleware', () => {
  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })

  it('passes a valid login payload', () => {
    const req = { body: { email: 'a@b.com', password: 'secret123' } }
    const res = makeRes()
    const next = vi.fn()

    validate('login')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('passes a valid register payload', () => {
    const req = { body: { email: 'x@y.com', password: 'Test@1234', role: 'volunteer', displayName: 'Alice' } }
    const res = makeRes()
    const next = vi.fn()

    validate('register')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects a register payload missing required fields', () => {
    const req = { body: { email: 'x@y.com' } }
    const res = makeRes()
    const next = vi.fn()

    validate('register')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects an invalid email', () => {
    const req = { body: { email: 'not-an-email', password: '123456', role: 'volunteer', displayName: 'Bob' } }
    const res = makeRes()
    const next = vi.fn()

    validate('register')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a short password', () => {
    const req = { body: { email: 'a@b.com', password: '12', role: 'volunteer', displayName: 'Bob' } }
    const res = makeRes()
    const next = vi.fn()

    validate('register')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('strips unknown fields from the body', () => {
    const req = { body: { email: 'a@b.com', password: '123456', role: 'volunteer', displayName: 'X', unknownField: 'should be stripped' } }
    const res = makeRes()
    const next = vi.fn()

    validate('login')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body.unknownField).toBeUndefined()
  })

  it('returns 400 for empty request body', () => {
    const req = { body: {} }
    const res = makeRes()
    const next = vi.fn()

    validate('login')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next directly for an unknown schema name', () => {
    const req = { body: { anything: 'goes' } }
    const res = makeRes()
    const next = vi.fn()

    validate('nonexistent')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('validateQuery middleware', () => {
  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() })

  it('passes valid query params and strips unknown', () => {
    const req = { query: { page: '1', limit: '20', unknownField: 'should be stripped' } }
    const res = makeRes()
    const next = vi.fn()

    validateQuery(querySchemas.requestsList)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.query.unknownField).toBeUndefined()
    expect(req.query.page).toBe(1)
  })

  it('rejects invalid query params', () => {
    const req = { query: { page: 'abc', limit: '20' } }
    const res = makeRes()
    const next = vi.fn()

    validateQuery(querySchemas.requestsList)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('applies defaults for missing optional params', () => {
    const req = { query: {} }
    const res = makeRes()
    const next = vi.fn()

    validateQuery(querySchemas.requestsList)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.query.page).toBe(1)
    expect(req.query.limit).toBe(20)
  })

  it('rejects invalid sort values', () => {
    const req = { query: { sort: 'invalidSortValue' } }
    const res = makeRes()
    const next = vi.fn()

    validateQuery(querySchemas.requestsList)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('sanitizeBody middleware', () => {
  it('strips <script> tags from body strings', () => {
    const req = { body: { name: '<script>alert(1)</script>' }, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body.name).not.toContain('<script>')
    expect(req.body.name).toContain('<blocked-script>')
    expect(next).toHaveBeenCalledOnce()
  })

  it('strips javascript: URIs from body strings', () => {
    const req = { body: { url: 'javascript:alert(1)' }, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body.url).toBe('blocked-javascript:alert(1)')
  })

  it('strips event handlers from body strings', () => {
    const req = { body: { text: 'onclick=evil()' }, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body.text).toContain('blocked-event=')
  })

  it('strips data:text/html from body strings', () => {
    const req = { body: { data: 'data:text/html,<script>alert(1)</script>' }, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body.data).toContain('blocked-data:')
  })

  it('strips dangerous patterns from query strings', () => {
    const req = { body: {}, query: { q: '<script>alert(1)</script>' }, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.query.q).toContain('<blocked-script>')
  })

  it('strips dangerous patterns from param strings', () => {
    const req = { body: {}, query: {}, params: { id: 'javascript:alert(1)' } }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.params.id).toContain('blocked-javascript:')
  })

  it('handles nested objects', () => {
    const req = { body: { user: { bio: '<script>hack()</script>' } }, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body.user.bio).toContain('<blocked-script>')
  })

  it('handles arrays in body', () => {
    const req = { body: { items: ['<script>a()</script>', 'safe'] }, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body.items[0]).toContain('<blocked-script>')
    expect(req.body.items[1]).toBe('safe')
  })

  it('skips non-object body', () => {
    const req = { body: 'just a string', query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body).toBe('just a string')
    expect(next).toHaveBeenCalledOnce()
  })

  it('skips null body', () => {
    const req = { body: null, query: {}, params: {} }
    const next = vi.fn()

    sanitizeBody(req, {}, next)

    expect(req.body).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('rateLimitUser middleware', () => {
  it('returns a middleware function', () => {
    const middleware = rateLimitUser()
    expect(typeof middleware).toBe('function')
    expect(middleware.length).toBe(3)
  })

  it('calls next on the first request below max', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 5 })
    const req = { user: null, ip: '10.0.0.1', baseUrl: '/api/test', path: '/route' }
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalledWith(429)
  })

  it('sets rate-limit headers on each request', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 10 })
    const req = { user: null, ip: '10.0.0.3', baseUrl: '/api/test', path: '/route' }
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()

    middleware(req, res, next)

    expect(res.set).toHaveBeenCalled()
    const headerArg = res.set.mock.calls[0][0]
    expect(headerArg).toHaveProperty('X-RateLimit-Limit', '10')
    expect(headerArg).toHaveProperty('X-RateLimit-Remaining')
    expect(headerArg).toHaveProperty('X-RateLimit-Reset')
  })

  it('blocks requests after exceeding the max', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 2 })
    const makeReq = (ip) => ({ user: null, ip, baseUrl: '/api/test', path: '/limit-test' })
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    const req = makeReq('10.0.0.4')

    middleware(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)

    middleware(req, res, next)
    expect(next).toHaveBeenCalledTimes(2)

    middleware(req, res, next)
    expect(next).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests, please slow down' })
  })

  it('uses a custom error message when provided', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 0, message: 'Custom limit message' })
    const req = { user: null, ip: '10.0.0.5', baseUrl: '/api/test', path: '/custom-msg' }
    const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()

    middleware(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ error: 'Custom limit message' })
  })

  it('tracks different routes separately', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 1 })
    const res1 = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    const res2 = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next1 = vi.fn()
    const next2 = vi.fn()

    const req1 = { user: null, ip: '10.0.0.6', baseUrl: '/api/a', path: '/r1' }
    const req2 = { user: null, ip: '10.0.0.6', baseUrl: '/api/b', path: '/r2' }

    middleware(req1, res1, next1)
    expect(next1).toHaveBeenCalledOnce()

    middleware(req2, res2, next2)
    expect(next2).toHaveBeenCalledOnce()
  })
})
