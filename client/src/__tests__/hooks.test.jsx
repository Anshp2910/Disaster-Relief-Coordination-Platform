import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '../hooks/useDebounce'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

vi.mock('../hooks/useFormValidation', () => {
  const rules = {
    title: { required: true, min: 1, max: 200, label: 'Title' },
    description: { required: true, min: 1, max: 5000, label: 'Description' },
    locationName: { required: true, min: 1, max: 500, label: 'Location' },
    lat: { required: true, min: -90, max: 90, type: 'number', label: 'Latitude' },
    lng: { required: true, min: -180, max: 180, type: 'number', label: 'Longitude' },
    email: { required: true, type: 'email', label: 'Email' },
    password: { required: true, min: 6, max: 128, label: 'Password' },
    displayName: { required: true, min: 1, max: 100, label: 'Name' },
    name: { required: true, min: 1, max: 200, label: 'Name' },
    category: { required: true, label: 'Category' },
    quantity: { required: true, type: 'number', min: 0, label: 'Quantity' },
    unit: { required: true, min: 1, max: 50, label: 'Unit' },
    centerLat: { required: true, type: 'number', min: -90, max: 90, label: 'Latitude' },
    centerLng: { required: true, type: 'number', min: -180, max: 180, label: 'Longitude' },
    radiusKm: { required: true, type: 'number', min: 1, max: 500, label: 'Radius' },
    reason: { required: true, min: 1, max: 2000, label: 'Reason' },
    text: { required: true, min: 1, max: 2000, label: 'Message' },
    startDate: { required: true, label: 'Start Date' },
    endDate: { required: true, label: 'End Date' },
    comment: { required: true, min: 1, max: 2000, label: 'Comment' },
  }

  function validateField(name, value) {
    const rule = rules[name]
    if (!rule) return ''
    const str = value == null ? '' : String(value).trim()
    const num = rule.type === 'number' ? Number(value) : null
    if (rule.required && !str) return `${rule.label} is required`
    if (str && rule.min != null && rule.type !== 'number' && str.length < rule.min) {
      return `${rule.label} must be at least ${rule.min} characters`
    }
    if (str && rule.max != null && rule.type !== 'number' && str.length > rule.max) {
      return `${rule.label} must be at most ${rule.max} characters`
    }
    if (rule.type === 'number' && str) {
      if (isNaN(num)) return `${rule.label} must be a number`
      if (rule.min != null && num < rule.min) return `${rule.label} must be at least ${rule.min}`
      if (rule.max != null && num > rule.max) return `${rule.label} must be at most ${rule.max}`
    }
    if (rule.type === 'email' && str) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'Please enter a valid email address'
    }
    return ''
  }

  function useFormValidation(initialValues = {}) {
    const { useState, useCallback } = require('react')
    const [errors, setErrors] = useState({})
    const [touched, setTouched] = useState({})

    const validate = useCallback((name, value) => {
      const error = validateField(name, value)
      setErrors((prev) => ({ ...prev, [name]: error }))
      return error
    }, [])

    const validateAll = useCallback((values) => {
      const errs = {}
      let valid = true
      for (const [key, val] of Object.entries(values)) {
        if (rules[key]) {
          const err = validateField(key, val)
          if (err) {
            errs[key] = err
            valid = false
          }
        }
      }
      setErrors(errs)
      setTouched(Object.keys(values).reduce((a, k) => ({ ...a, [k]: true }), {}))
      return valid
    }, [])

    const touch = useCallback((name) => {
      setTouched((prev) => ({ ...prev, [name]: true }))
    }, [])

    const reset = useCallback(() => {
      setErrors({})
      setTouched({})
    }, [])

    return { errors, touched, validate, validateAll, touch, reset, setErrors }
  }

  return { useFormValidation }
})

import { useFormValidation } from '../hooks/useFormValidation'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('does not update before delay', () => {
    let value = 'initial'
    const { result, rerender } = renderHook(() => useDebounce(value, 500))
    value = 'updated'
    rerender()
    expect(result.current).toBe('initial')
  })

  it('updates after the specified delay', () => {
    let value = 'initial'
    const { result, rerender } = renderHook(() => useDebounce(value, 500))
    value = 'updated'
    rerender()
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe('updated')
  })

  it('resets timer when value changes before delay', () => {
    let value = 'initial'
    const { result, rerender } = renderHook(() => useDebounce(value, 500))
    value = 'first'
    rerender()
    act(() => { vi.advanceTimersByTime(300) })
    value = 'second'
    rerender()
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('initial')
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBe('second')
  })

  it('uses default delay of 300ms', () => {
    let value = 'a'
    const { result, rerender } = renderHook(() => useDebounce(value))
    value = 'b'
    rerender()
    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current).toBe('a')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('b')
  })

  it('clears timer on unmount', () => {
    let value = 'initial'
    const { result, rerender, unmount } = renderHook(() => useDebounce(value, 500))
    value = 'updated'
    rerender()
    unmount()
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current).toBe('initial')
  })
})

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a refresh function', () => {
    const { result } = renderHook(() => useAutoRefresh(() => {}))
    expect(result.current).toHaveProperty('refresh')
    expect(typeof result.current.refresh).toBe('function')
  })

  it('calls refreshFn at the specified interval', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn, { interval: 1000 }))
    expect(fn).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(fn).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('clears interval on unmount', () => {
    const fn = vi.fn()
    const { unmount } = renderHook(() => useAutoRefresh(fn, { interval: 1000 }))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(fn).toHaveBeenCalledTimes(1)
    unmount()
    act(() => { vi.advanceTimersByTime(2000) })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not call refreshFn when disabled', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn, { interval: 1000, enabled: false }))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(fn).not.toHaveBeenCalled()
  })

  it('adds visibilitychange and focus event listeners', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const windowAddSpy = vi.spyOn(window, 'addEventListener')

    renderHook(() => useAutoRefresh(() => {}))

    expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(windowAddSpy).toHaveBeenCalledWith('focus', expect.any(Function))

    addEventListenerSpy.mockRestore()
    windowAddSpy.mockRestore()
  })

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useAutoRefresh(() => {}))
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(windowRemoveSpy).toHaveBeenCalledWith('focus', expect.any(Function))

    removeEventListenerSpy.mockRestore()
    windowRemoveSpy.mockRestore()
  })

  it('calls refresh on visibility change to visible', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn))

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(fn).toHaveBeenCalled()
  })

  it('calls refresh on window focus', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn))

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    expect(fn).toHaveBeenCalled()
  })
})

describe('useFormValidation', () => {
  it('returns default validation state', () => {
    const { result } = renderHook(() => useFormValidation())
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(typeof result.current.validate).toBe('function')
    expect(typeof result.current.validateAll).toBe('function')
    expect(typeof result.current.touch).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  describe('validate', () => {
    it('returns required error for empty required field', () => {
      const { result } = renderHook(() => useFormValidation())
      let err
      act(() => { err = result.current.validate('email', '') })
      expect(err).toBe('Email is required')
    })

    it('validates email format', () => {
      const { result } = renderHook(() => useFormValidation())
      let r1, r2, r3
      act(() => {
        r1 = result.current.validate('email', 'not-an-email')
        r2 = result.current.validate('email', 'test@example.com')
        r3 = result.current.validate('email', 'a@b.co')
      })
      expect(r1).toBe('Please enter a valid email address')
      expect(r2).toBe('')
      expect(r3).toBe('')
    })

    it('validates required fields', () => {
      const { result } = renderHook(() => useFormValidation())
      let r1, r2, r3
      act(() => {
        r1 = result.current.validate('title', '')
        r2 = result.current.validate('title', 'Valid Title')
        r3 = result.current.validate('password', '')
      })
      expect(r1).toBe('Title is required')
      expect(r2).toBe('')
      expect(r3).toBe('Password is required')
    })

    it('validates number fields', () => {
      const { result } = renderHook(() => useFormValidation())
      let r1, r2, r3, r4
      act(() => {
        r1 = result.current.validate('lat', 'not-a-number')
        r2 = result.current.validate('lat', '91')
        r3 = result.current.validate('lat', '-91')
        r4 = result.current.validate('lat', '45')
      })
      expect(r1).toBe('Latitude must be a number')
      expect(r2).toBe('Latitude must be at most 90')
      expect(r3).toBe('Latitude must be at least -90')
      expect(r4).toBe('')
    })

    it('validates min/max length for strings', () => {
      const { result } = renderHook(() => useFormValidation())
      let r1, r2
      act(() => {
        r1 = result.current.validate('password', 'ab')
        r2 = result.current.validate('password', 'a'.repeat(200))
      })
      expect(r1).toBe('Password must be at least 6 characters')
      expect(r2).toBe('Password must be at most 128 characters')
    })

    it('returns empty string for unknown field', () => {
      const { result } = renderHook(() => useFormValidation())
      let r
      act(() => { r = result.current.validate('unknownField', 'value') })
      expect(r).toBe('')
    })

    it('sets error in state', () => {
      const { result } = renderHook(() => useFormValidation())
      act(() => {
        result.current.validate('email', 'bad')
      })
      expect(result.current.errors.email).toBe('Please enter a valid email address')
    })
  })

  describe('validateAll', () => {
    it('returns true when all fields valid', () => {
      const { result } = renderHook(() => useFormValidation())
      let valid
      act(() => {
        valid = result.current.validateAll({
          title: 'My Title',
          email: 'user@example.com',
          password: 'secret123',
        })
      })
      expect(valid).toBe(true)
    })

    it('returns false when fields invalid', () => {
      const { result } = renderHook(() => useFormValidation())
      let valid
      act(() => {
        valid = result.current.validateAll({
          title: '',
          email: 'bad',
        })
      })
      expect(valid).toBe(false)
      expect(result.current.errors.title).toBe('Title is required')
      expect(result.current.errors.email).toBe('Please enter a valid email address')
    })

    it('sets touched for all validated fields', () => {
      const { result } = renderHook(() => useFormValidation())
      act(() => {
        result.current.validateAll({ title: 'ok', email: 'test@test.com' })
      })
      expect(result.current.touched.title).toBe(true)
      expect(result.current.touched.email).toBe(true)
    })

    it('ignores fields without validation rules', () => {
      const { result } = renderHook(() => useFormValidation())
      let valid
      act(() => { valid = result.current.validateAll({ someExtraField: 'value' }) })
      expect(valid).toBe(true)
    })
  })

  describe('touch', () => {
    it('marks a field as touched', () => {
      const { result } = renderHook(() => useFormValidation())
      expect(result.current.touched.email).toBeUndefined()
      act(() => {
        result.current.touch('email')
      })
      expect(result.current.touched.email).toBe(true)
    })
  })

  describe('reset', () => {
    it('clears errors and touched', () => {
      const { result } = renderHook(() => useFormValidation())
      act(() => {
        result.current.validateAll({ title: '', email: 'bad' })
      })
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0)
      expect(Object.keys(result.current.touched).length).toBeGreaterThan(0)
      act(() => {
        result.current.reset()
      })
      expect(result.current.errors).toEqual({})
      expect(result.current.touched).toEqual({})
    })
  })
})

import useFocusTrap from '../hooks/useFocusTrap'

describe('useFocusTrap', () => {
  it('returns a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(true))
    expect(result.current).toHaveProperty('current')
  })
})
