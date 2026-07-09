import { describe, it, expect } from 'vitest'
import { escCsv } from '../src/utils/csv.js'
import { sanitizeBody } from '../src/middleware/sanitize.js'
import { checkAndRecordAttempt } from '../src/routes/auth.js'

describe('escCsv (CSV injection protection)', () => {
  it('wraps a plain value in double quotes', () => {
    expect(escCsv('hello')).toBe('"hello"')
  })

  it('escapes embedded double quotes by doubling them', () => {
    expect(escCsv('he"llo')).toBe('"he""llo"')
  })

  it('prefixes a value starting with = with a single quote to prevent formula injection', () => {
    const result = escCsv('=SUM(A1:A10)')
    expect(result).toMatch(/^"'/)
    expect(result).toContain('=SUM')
  })

  it('prefixes a value starting with + to prevent formula injection', () => {
    const result = escCsv('+1234')
    expect(result).toMatch(/^"'/)
  })

  it('prefixes a value starting with - to prevent formula injection', () => {
    const result = escCsv('-1+1')
    expect(result).toMatch(/^"'/)
  })

  it('prefixes a value starting with @ to prevent formula injection', () => {
    const result = escCsv('@SUM')
    expect(result).toMatch(/^"'/)
  })

  it('prefixes a value starting with | to prevent formula injection', () => {
    const result = escCsv('|CONCAT')
    expect(result).toMatch(/^"'/)
  })

  it('handles numbers', () => {
    expect(escCsv(42)).toBe('"42"')
  })

  it('handles boolean values', () => {
    expect(escCsv(true)).toBe('"true"')
  })

  it('handles empty string', () => {
    expect(escCsv('')).toBe('""')
  })

  it('handles null or undefined by converting to string', () => {
    expect(escCsv(null)).toBe('"null"')
    expect(escCsv(undefined)).toBe('"undefined"')
  })

  it('escapes quotes in injection values', () => {
    const result = escCsv('=HYPERLINK("http://evil.com")')
    expect(result).toMatch(/^"'/)
    expect(result).toContain('""')
  })
})

describe('sanitizeBody (XSS protection)', () => {
  it('blocks <script> tags in body strings', () => {
    const req = { body: { comment: '<script>stealCookies()</script>' }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.comment).not.toContain('<script>')
    expect(req.body.comment).toContain('<blocked-script>')
  })

  it('blocks javascript: URIs', () => {
    const req = { body: { link: 'javascript:alert(1)' }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.link).toBe('blocked-javascript:alert(1)')
  })

  it('blocks on-event handlers', () => {
    const req = { body: { html: '<div onmouseover="evil()">hover</div>' }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.html).toContain('blocked-event=')
  })

  it('blocks data:text/html', () => {
    const req = { body: { x: 'data:text/html,<script>alert(1)</script>' }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.x).toContain('blocked-data:')
  })

  it('blocks CSS expression()', () => {
    const req = { body: { x: 'expression(alert(1))' }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.x).toContain('blocked-expression(')
  })

  it('sanitizes nested object properties', () => {
    const req = { body: { user: { profile: { bio: '<script>bad()</script>' } } }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.user.profile.bio).toContain('<blocked-script>')
  })

  it('sanitizes array elements', () => {
    const req = { body: { tags: ['<script>a()</script>', 'normal'] }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body.tags[0]).toContain('<blocked-script>')
    expect(req.body.tags[1]).toBe('normal')
  })

  it('sanitizes object keys', () => {
    const req = { body: { 'onclick=alert(1)': 'value' }, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    const keys = Object.keys(req.body)
    expect(keys[0]).toContain('blocked-event=')
  })

  it('sanitizes query strings', () => {
    const req = { body: {}, query: { search: '<script>document.cookie</script>' }, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.query.search).toContain('<blocked-script>')
  })

  it('sanitizes param strings', () => {
    const req = { body: {}, query: {}, params: { id: 'javascript:void(0)' } }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.params.id).toContain('blocked-javascript:')
  })

  it('returns non-object body unchanged', () => {
    const req = { body: 'raw string', query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body).toBe('raw string')
  })

  it('handles null body', () => {
    const req = { body: null, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body).toBeNull()
  })

  it('handles undefined body', () => {
    const req = { body: undefined, query: {}, params: {} }
    const next = () => {}
    sanitizeBody(req, {}, next)
    expect(req.body).toBeUndefined()
  })
})

describe('checkAndRecordAttempt (account lockout)', () => {
  it('returns false on first attempt', () => {
    expect(checkAndRecordAttempt('first@test.com')).toBe(false)
  })

  it('returns false after a few attempts', () => {
    const email = 'few@test.com'
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
  })

  it('locks after 10 consecutive failed attempts', () => {
    const email = 'lockout@test.com'
    for (let i = 0; i < 10; i++) {
      const result = checkAndRecordAttempt(email)
      if (result) {
        throw new Error(`Unexpected lockout on attempt ${i + 1}`)
      }
    }
    expect(checkAndRecordAttempt(email)).toBe(true)
  })

  it('treats email case-insensitively', () => {
    const email = 'CaseTest@TEST.com'
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt('casetest@test.com')).toBe(false)
    expect(checkAndRecordAttempt('CASETEST@TEST.COM')).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(false)
    expect(checkAndRecordAttempt(email)).toBe(true)
  })

  it('does not affect different email addresses', () => {
    const emailA = 'independent-a@test.com'
    const emailB = 'independent-b@test.com'

    expect(checkAndRecordAttempt(emailA)).toBe(false)
    expect(checkAndRecordAttempt(emailA)).toBe(false)

    expect(checkAndRecordAttempt(emailB)).toBe(false)

    expect(checkAndRecordAttempt(emailA)).toBe(false)
  })
})
