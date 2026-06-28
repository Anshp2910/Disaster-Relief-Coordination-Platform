import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '../utils/getErrorMessage'

describe('getErrorMessage', () => {
  it('returns message from Error instances', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe('something broke')
  })

  it('returns message from TypeError', () => {
    expect(getErrorMessage(new TypeError('type mismatch'))).toBe('type mismatch')
  })

  it('returns the string itself for string errors', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error')
  })

  it('returns message from objects with a message property', () => {
    expect(getErrorMessage({ message: 'obj msg' })).toBe('obj msg')
  })

  it('converts non-string message to string', () => {
    expect(getErrorMessage({ message: 42 })).toBe('42')
  })

  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred')
  })

  it('returns fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred')
  })

  it('returns fallback for numbers', () => {
    expect(getErrorMessage(404)).toBe('An unknown error occurred')
  })

  it('returns fallback for booleans', () => {
    expect(getErrorMessage(false)).toBe('An unknown error occurred')
  })

  it('returns fallback for empty object without message', () => {
    expect(getErrorMessage({})).toBe('An unknown error occurred')
  })
})
