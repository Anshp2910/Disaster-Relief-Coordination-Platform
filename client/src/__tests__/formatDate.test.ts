import { describe, it, expect } from 'vitest'
import { formatDate } from '../utils/formatDate'

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('')
  })

  it('returns empty string for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('')
  })

  it('formats a valid date string', () => {
    const result = formatDate('2025-01-15')
    expect(result).toMatch(/Wed/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2025/)
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date(2025, 5, 10))
    expect(result).toMatch(/Tue/)
    expect(result).toMatch(/10/)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/2025/)
  })

  it('formats a numeric timestamp', () => {
    const result = formatDate(Date.UTC(2025, 0, 1))
    expect(result).toMatch(/2025/)
  })
})
