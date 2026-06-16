import { describe, it, expect } from 'vitest'
import { getEnv } from '../config/env.js'

describe('getEnv', () => {
  it('returns the env var value when set', () => {
    process.env.TEST_VAR = 'hello'
    expect(getEnv('TEST_VAR')).toBe('hello')
    delete process.env.TEST_VAR
  })

  it('returns fallback when env var is missing', () => {
    delete process.env.MISSING_VAR
    expect(getEnv('MISSING_VAR', 'default')).toBe('default')
  })

  it('throws when env var is missing and no fallback', () => {
    delete process.env.MISSING_VAR
    expect(() => getEnv('MISSING_VAR')).toThrow('Missing required env var: MISSING_VAR')
  })

  it('returns fallback when env var is empty string', () => {
    process.env.EMPTY_VAR = ''
    expect(getEnv('EMPTY_VAR', 'fallback')).toBe('fallback')
    delete process.env.EMPTY_VAR
  })
})
