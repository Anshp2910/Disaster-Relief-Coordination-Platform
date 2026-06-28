import { describe, it, expect, vi } from 'vitest'
import { sanitizeBody } from '../middleware/sanitize.js'

function makeReq(body = {}, query = {}, params = {}) {
  return { body, query, params }
}

function callMiddleware(body, query = {}, params = {}) {
  const req = makeReq(body, query, params)
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  sanitizeBody(req, res, next)
  return { req, next }
}

describe('sanitizeBody', () => {
  it('calls next()', () => {
    const { next } = callMiddleware({})
    expect(next).toHaveBeenCalled()
  })

  it('strips <script> opening tags', () => {
    const { req } = callMiddleware({ text: '<script>alert(1)</script>' })
    expect(req.body.text).toContain('<blocked-script>')
    expect(req.body.text).not.toContain('<script')
  })

  it('strips </script> closing tags', () => {
    const { req } = callMiddleware({ text: '</script>' })
    expect(req.body.text).toBe('')
  })

  it('strips javascript: URIs', () => {
    const { req } = callMiddleware({ url: 'javascript:alert(1)' })
    expect(req.body.url).toBe('blocked-javascript:alert(1)')
    expect(req.body.url).not.toBe('javascript:alert(1)')
  })

  it('strips event handlers', () => {
    const { req } = callMiddleware({ tag: '<div onclick=alert(1)>' })
    expect(req.body.tag).toContain('blocked-event=')
    expect(req.body.tag).not.toContain('onclick')
  })

  it('strips onerror handler', () => {
    const { req } = callMiddleware({ tag: '<img onerror=alert(1)>' })
    expect(req.body.tag).toContain('blocked-event=')
  })

  it('strips eval()', () => {
    const { req } = callMiddleware({ code: 'eval(document.cookie)' })
    expect(req.body.code).toBe('blocked-eval(blocked-cookie)')
    expect(req.body.code).not.toBe('eval(document.cookie)')
  })

  it('strips iframe tags', () => {
    const { req } = callMiddleware({ html: '<iframe src="evil.com">' })
    expect(req.body.html).toContain('<blocked-iframe>')
  })

  it('strips object tags', () => {
    const { req } = callMiddleware({ html: '<object data="evil.swf">' })
    expect(req.body.html).toContain('<blocked-object>')
  })

  it('strips embed tags', () => {
    const { req } = callMiddleware({ html: '<embed src="evil.swf">' })
    expect(req.body.html).toContain('<blocked-embed>')
  })

  it('strips svg tags', () => {
    const { req } = callMiddleware({ html: '<svg onload=alert(1)>' })
    expect(req.body.html).toContain('<blocked-svg>')
  })

  it('strips document.cookie access', () => {
    const { req } = callMiddleware({ code: 'document.cookie' })
    expect(req.body.code).toContain('blocked-cookie')
  })

  it('passes clean input through unchanged', () => {
    const { req } = callMiddleware({ name: 'John Doe', count: 5 })
    expect(req.body.name).toBe('John Doe')
    expect(req.body.count).toBe(5)
  })

  it('sanitizes nested objects', () => {
    const { req } = callMiddleware({ nested: { text: '<script>x</script>' } })
    expect(req.body.nested.text).toContain('<blocked-script>')
  })

  it('sanitizes arrays', () => {
    const { req } = callMiddleware({ items: ['<script>a</script>', 'clean'] })
    expect(req.body.items[0]).toContain('<blocked-script>')
    expect(req.body.items[1]).toBe('clean')
  })

  it('sanitizes query string values', () => {
    const { req } = callMiddleware({}, { q: 'javascript:alert(1)' })
    expect(req.query.q).toContain('blocked-javascript:')
  })

  it('sanitizes params values', () => {
    const { req } = callMiddleware({}, {}, { id: '<script>1</script>' })
    expect(req.params.id).toContain('<blocked-script>')
  })

  it('does not modify non-string primitives in arrays', () => {
    const { req } = callMiddleware({ arr: [1, true, null] })
    expect(req.body.arr).toEqual([1, true, null])
  })
})
