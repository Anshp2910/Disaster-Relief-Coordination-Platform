import { describe, it, expect, vi } from 'vitest'
import { rateLimitUser } from '../middleware/rateLimitUser.js'

let testCounter = 0
function uniquePath() {
  return `/test-${++testCounter}-${Date.now()}`
}

function makeReq(user = null, ip = '127.0.0.1', path) {
  return { user, ip, baseUrl: '/api', path: path || uniquePath() }
}

function makeRes() {
  const headers = {}
  const res = {
    statusCode: null,
    body: null,
    headers,
    set(obj) { Object.assign(headers, obj) },
    status(code) { res.statusCode = code; return res },
    json(data) { res.body = data; return res },
  }
  return res
}

describe('rateLimitUser', () => {
  it('calls next for requests under the limit', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 5 })
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('sets rate limit headers', () => {
    const middleware = rateLimitUser({ windowMs: 60000, max: 10 })
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()
    middleware(req, res, next)
    expect(res.headers['X-RateLimit-Limit']).toBe('10')
    expect(res.headers['X-RateLimit-Remaining']).toBe('9')
    expect(res.headers['X-RateLimit-Reset']).toBeDefined()
  })

  it('blocks after exceeding max', () => {
    const path = uniquePath()
    const middleware = rateLimitUser({ windowMs: 60000, max: 2 })
    const next = vi.fn()
    middleware(makeReq(null, '127.0.0.1', path), makeRes(), vi.fn())
    middleware(makeReq(null, '127.0.0.1', path), makeRes(), vi.fn())
    const res = makeRes()
    middleware(makeReq(null, '127.0.0.1', path), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(429)
    expect(res.body.error).toBe('Too many requests, please slow down')
  })

  it('uses custom message', () => {
    const path = uniquePath()
    const middleware = rateLimitUser({ windowMs: 60000, max: 1, message: 'Slow down!' })
    middleware(makeReq(null, '127.0.0.1', path), makeRes(), vi.fn())
    const res = makeRes()
    middleware(makeReq(null, '127.0.0.1', path), res, vi.fn())
    expect(res.body.error).toBe('Slow down!')
  })

  it('uses userId when available', () => {
    const path = uniquePath()
    const middleware = rateLimitUser({ windowMs: 60000, max: 1 })
    const user = { _id: { toString: () => 'user123' } }
    middleware(makeReq(user, '127.0.0.1', path), makeRes(), vi.fn())
    const res = makeRes()
    const next = vi.fn()
    middleware(makeReq(user, '127.0.0.1', path), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(429)
  })

  it('resets after window expires', async () => {
    const path = uniquePath()
    const middleware = rateLimitUser({ windowMs: 50, max: 1 })
    const res1 = makeRes()
    middleware(makeReq(null, '127.0.0.1', path), res1, vi.fn())
    expect(res1.statusCode).toBeNull()

    await new Promise(r => setTimeout(r, 60))

    const res2 = makeRes()
    const next = vi.fn()
    middleware(makeReq(null, '127.0.0.1', path), res2, next)
    expect(next).toHaveBeenCalled()
  })

  it('defaults to ip when no user', () => {
    const path = uniquePath()
    const middleware = rateLimitUser({ windowMs: 60000, max: 1 })
    middleware(makeReq(null, '10.0.0.1', path), makeRes(), vi.fn())
    const res = makeRes()
    middleware(makeReq(null, '10.0.0.1', path), res, vi.fn())
    expect(res.statusCode).toBe(429)
  })

  it('decrements remaining count', () => {
    const path = uniquePath()
    const middleware = rateLimitUser({ windowMs: 60000, max: 3 })
    const res1 = makeRes()
    middleware(makeReq(null, '127.0.0.1', path), res1, vi.fn())
    expect(res1.headers['X-RateLimit-Remaining']).toBe('2')

    const res2 = makeRes()
    middleware(makeReq(null, '127.0.0.1', path), res2, vi.fn())
    expect(res2.headers['X-RateLimit-Remaining']).toBe('1')

    const res3 = makeRes()
    middleware(makeReq(null, '127.0.0.1', path), res3, vi.fn())
    expect(res3.headers['X-RateLimit-Remaining']).toBe('0')
  })
})
