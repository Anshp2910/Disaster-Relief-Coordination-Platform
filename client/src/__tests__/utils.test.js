import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { escapeHtml } from '../utils/escapeHtml'
import { formatDate } from '../utils/formatDate'
import L from 'leaflet'

vi.mock('leaflet', () => {
  const createMockMap = () => ({
    setView: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  })
  return {
    default: {
      map: vi.fn(createMockMap),
      tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    },
  }
})

import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'

describe('escapeHtml', () => {
  it('escapes & < > " and single quote', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('handles null/undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('handles numbers', () => {
    expect(escapeHtml(42)).toBe('42')
  })

  it('handles zero as value', () => {
    expect(escapeHtml(0)).toBe('0')
  })

  it('handles strings without special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('prevents XSS with script tag', () => {
    expect(escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('encodes ampersand to avoid double encoding later', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;')
  })

  it('handles boolean values', () => {
    expect(escapeHtml(true)).toBe('true')
  })

  it('handles false as value', () => {
    expect(escapeHtml(false)).toBe('false')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2025-01-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles Date object', () => {
    const result = formatDate(new Date('2025-06-01'))
    expect(typeof result).toBe('string')
  })

  it('handles timestamp number', () => {
    const result = formatDate(1700000000000)
    expect(typeof result).toBe('string')
  })

  it('returns a locale-formatted string for valid input', () => {
    const date = new Date(2025, 0, 15)
    const result = formatDate(date)
    expect(result).toContain('2025')
    expect(result).toContain('Jan')
  })

  it('handles invalid date string gracefully', () => {
    expect(() => formatDate('not-a-date')).not.toThrow()
    expect(typeof formatDate('not-a-date')).toBe('string')
  })

  it('handles undefined gracefully', () => {
    expect(() => formatDate(undefined)).not.toThrow()
    expect(typeof formatDate(undefined)).toBe('string')
  })

  it('handles null gracefully', () => {
    expect(() => formatDate(null)).not.toThrow()
    expect(typeof formatDate(null)).toBe('string')
  })

  it('handles empty string', () => {
    expect(() => formatDate('')).not.toThrow()
    expect(typeof formatDate('')).toBe('string')
  })

  it('returns a string for invalid dates without crashing', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('')
  })
})

describe('initLeafletMap', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => setTimeout(cb, 0)))
    vi.stubGlobal('ResizeObserver', vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a map with default center and zoom', () => {
    const container = document.createElement('div')
    const map = initLeafletMap(container)
    expect(map.setView).toHaveBeenCalledWith([20.5937, 78.9629], 5)
  })

  it('uses custom center and zoom', () => {
    const container = document.createElement('div')
    const map = initLeafletMap(container, { center: [10, 20], zoom: 8 })
    expect(map.setView).toHaveBeenCalledWith([10, 20], 8)
  })

  it('attaches click handler when provided', () => {
    const onClick = vi.fn()
    const container = document.createElement('div')
    const map = initLeafletMap(container, { onClick })
    expect(map.on).toHaveBeenCalledWith('click', onClick)
  })

  it('does not attach click handler when not provided', () => {
    const container = document.createElement('div')
    const map = initLeafletMap(container)
    expect(map.on).not.toHaveBeenCalled()
  })

  it('creates a tile layer', () => {
    const container = document.createElement('div')
    initLeafletMap(container)
    expect(L.tileLayer).toHaveBeenCalled()
  })

  it('sets up ResizeObserver when available', () => {
    const observe = vi.fn()
    vi.stubGlobal('ResizeObserver', vi.fn(() => ({
      observe,
      disconnect: vi.fn(),
    })))
    const container = document.createElement('div')
    const map = initLeafletMap(container)
    expect(observe).toHaveBeenCalledWith(container)
    expect(map.__resizeObserver).toBeDefined()
  })
})

describe('cleanupLeafletMap', () => {
  it('does nothing for null/undefined', () => {
    expect(() => cleanupLeafletMap(null)).not.toThrow()
    expect(() => cleanupLeafletMap(undefined)).not.toThrow()
  })

  it('removes the map and disconnects resize observer', () => {
    const disconnect = vi.fn()
    const remove = vi.fn()
    const map = { __resizeObserver: { disconnect }, remove }
    cleanupLeafletMap(map)
    expect(disconnect).toHaveBeenCalled()
    expect(remove).toHaveBeenCalled()
  })

  it('handles map without resize observer', () => {
    const remove = vi.fn()
    const map = { remove }
    cleanupLeafletMap(map)
    expect(remove).toHaveBeenCalled()
  })
})

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('handles invalid date', () => {
    const result = formatDate('not-a-date')
    expect(result).toBe('')
  })

  it('handles null/undefined', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })
})
