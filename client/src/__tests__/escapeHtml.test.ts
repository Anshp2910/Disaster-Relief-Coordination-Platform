import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../utils/escapeHtml'

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('escapes less-than', () => {
    expect(escapeHtml('a<b')).toBe('a&lt;b')
  })

  it('escapes greater-than', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("a'b")).toBe('a&#39;b')
  })

  it('escapes multiple special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('converts numbers to string', () => {
    expect(escapeHtml(42)).toBe('42')
  })

  it('converts booleans to string', () => {
    expect(escapeHtml(true)).toBe('true')
  })

  it('passes clean strings through unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})
