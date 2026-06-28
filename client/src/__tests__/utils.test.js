import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
