import { describe, it, expect } from 'vitest'
import {
  STATUS_COLORS,
  PRIORITY_COLORS,
  CATEGORY_COLORS,
  MAP_MARKER_COLORS,
  SHIFT_COLORS,
  RESOURCE_STATUS_COLORS,
  COLORS_FALLBACK,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS,
  RESOURCE_STATUS_OPTIONS,
} from '../utils/constants'

describe('constants', () => {
  describe('STATUS_COLORS', () => {
    it('has entries for all status values', () => {
      expect(STATUS_COLORS).toHaveProperty('Open')
      expect(STATUS_COLORS).toHaveProperty('Pending')
      expect(STATUS_COLORS).toHaveProperty('In Progress')
      expect(STATUS_COLORS).toHaveProperty('Resolved')
      expect(STATUS_COLORS).toHaveProperty('Fulfilled')
    })

    it('each entry has bg, border, text', () => {
      for (const key of Object.keys(STATUS_COLORS)) {
        expect(STATUS_COLORS[key]).toHaveProperty('bg')
        expect(STATUS_COLORS[key]).toHaveProperty('border')
        expect(STATUS_COLORS[key]).toHaveProperty('text')
      }
    })
  })

  describe('PRIORITY_COLORS', () => {
    it('has entries for all priorities', () => {
      expect(PRIORITY_COLORS).toHaveProperty('Critical')
      expect(PRIORITY_COLORS).toHaveProperty('High')
      expect(PRIORITY_COLORS).toHaveProperty('Medium')
      expect(PRIORITY_COLORS).toHaveProperty('Low')
    })
  })

  describe('CATEGORY_COLORS', () => {
    it('has entries for all categories', () => {
      expect(CATEGORY_COLORS).toHaveProperty('Medical')
      expect(CATEGORY_COLORS).toHaveProperty('Food')
      expect(CATEGORY_COLORS).toHaveProperty('Shelter')
      expect(CATEGORY_COLORS).toHaveProperty('Other')
    })

    it('has 14 categories', () => {
      expect(Object.keys(CATEGORY_COLORS)).toHaveLength(14)
    })
  })

  describe('MAP_MARKER_COLORS', () => {
    it('maps statuses to color values', () => {
      expect(typeof MAP_MARKER_COLORS['Open']).toBe('string')
      expect(typeof MAP_MARKER_COLORS['Resolved']).toBe('string')
    })
  })

  describe('SHIFT_COLORS', () => {
    it('has morning, afternoon, night', () => {
      expect(SHIFT_COLORS).toHaveProperty('morning')
      expect(SHIFT_COLORS).toHaveProperty('afternoon')
      expect(SHIFT_COLORS).toHaveProperty('night')
    })
  })

  describe('RESOURCE_STATUS_COLORS', () => {
    it('has Available, Deployed, Maintenance', () => {
      expect(RESOURCE_STATUS_COLORS).toHaveProperty('Available')
      expect(RESOURCE_STATUS_COLORS).toHaveProperty('Deployed')
      expect(RESOURCE_STATUS_COLORS).toHaveProperty('Maintenance')
    })
  })

  describe('COLORS_FALLBACK', () => {
    it('has bg, border, text', () => {
      expect(COLORS_FALLBACK).toHaveProperty('bg')
      expect(COLORS_FALLBACK).toHaveProperty('border')
      expect(COLORS_FALLBACK).toHaveProperty('text')
    })
  })

  describe('option arrays', () => {
    it('STATUS_OPTIONS has 5 items', () => {
      expect(STATUS_OPTIONS).toHaveLength(5)
    })

    it('PRIORITY_OPTIONS has 4 items', () => {
      expect(PRIORITY_OPTIONS).toHaveLength(4)
    })

    it('CATEGORY_OPTIONS has 14 items', () => {
      expect(CATEGORY_OPTIONS).toHaveLength(14)
    })

    it('RESOURCE_STATUS_OPTIONS has 3 items', () => {
      expect(RESOURCE_STATUS_OPTIONS).toHaveLength(3)
    })

    it('STATUS_OPTIONS contains expected values', () => {
      expect(STATUS_OPTIONS).toContain('Open')
      expect(STATUS_OPTIONS).toContain('Fulfilled')
    })

    it('PRIORITY_OPTIONS contains expected values', () => {
      expect(PRIORITY_OPTIONS).toContain('Critical')
      expect(PRIORITY_OPTIONS).toContain('Low')
    })
  })
})
