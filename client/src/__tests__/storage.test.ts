import { describe, it, expect, beforeEach } from 'vitest'
import { safeGetItem, safeSetItem, safeRemoveItem, parseUser } from '../utils/storage'

describe('safe storage utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('safeGetItem', () => {
    it('returns value for existing key', () => {
      localStorage.setItem('testKey', 'testValue')
      expect(safeGetItem('testKey')).toBe('testValue')
    })

    it('returns null for non-existent key', () => {
      expect(safeGetItem('missing')).toBeNull()
    })
  })

  describe('safeSetItem', () => {
    it('stores a value', () => {
      safeSetItem('k', 'v')
      expect(localStorage.getItem('k')).toBe('v')
    })

    it('overwrites existing value', () => {
      safeSetItem('k', 'v1')
      safeSetItem('k', 'v2')
      expect(localStorage.getItem('k')).toBe('v2')
    })
  })

  describe('safeRemoveItem', () => {
    it('removes an item', () => {
      localStorage.setItem('k', 'v')
      safeRemoveItem('k')
      expect(localStorage.getItem('k')).toBeNull()
    })

    it('does not throw for non-existent key', () => {
      expect(() => safeRemoveItem('nope')).not.toThrow()
    })
  })

  describe('parseUser', () => {
    it('returns parsed user object', () => {
      localStorage.setItem('user', JSON.stringify({ name: 'Alice' }))
      expect(parseUser()).toEqual({ name: 'Alice' })
    })

    it('returns null when no user stored', () => {
      expect(parseUser()).toBeNull()
    })

    it('returns null for invalid JSON', () => {
      localStorage.setItem('user', '{bad json')
      expect(parseUser()).toBeNull()
    })
  })
})
