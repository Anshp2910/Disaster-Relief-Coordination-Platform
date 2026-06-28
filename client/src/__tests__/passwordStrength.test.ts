import { describe, it, expect } from 'vitest'
import { evaluatePasswordStrength } from '../utils/passwordStrength'

describe('evaluatePasswordStrength', () => {
  it('returns null for empty string', () => {
    expect(evaluatePasswordStrength('')).toBeNull()
  })

  it('returns weak for short lowercase-only', () => {
    const result = evaluatePasswordStrength('abc')
    expect(result).toEqual({ className: 'weak', labelKey: 'profile.passwordWeak' })
  })

  it('returns weak for only lowercase and digits', () => {
    const result = evaluatePasswordStrength('abc123')
    expect(result).toEqual({ className: 'weak', labelKey: 'profile.passwordWeak' })
  })

  it('returns weak for length >= 8 but only lowercase', () => {
    const result = evaluatePasswordStrength('abcdefgh')
    expect(result).toEqual({ className: 'weak', labelKey: 'profile.passwordWeak' })
  })

  it('returns medium for exactly 3 criteria (length + lowercase + uppercase)', () => {
    const result = evaluatePasswordStrength('Abcdefgh')
    expect(result).toEqual({ className: 'medium', labelKey: 'profile.passwordMedium' })
  })

  it('returns strong for 4 criteria (length + lowercase + uppercase + digit)', () => {
    const result = evaluatePasswordStrength('Abc12345')
    expect(result).toEqual({ className: 'strong', labelKey: 'profile.passwordStrong' })
  })

  it('returns very-strong for all 5 criteria (length + lower + upper + digit + special)', () => {
    const result = evaluatePasswordStrength('Abc1234!')
    expect(result).toEqual({ className: 'very-strong', labelKey: 'profile.passwordVeryStrong' })
  })

  it('returns very-strong for all five criteria met (score 5)', () => {
    const result = evaluatePasswordStrength('Abc1234!x')
    expect(result).toEqual({ className: 'very-strong', labelKey: 'profile.passwordVeryStrong' })
  })

  it('returns very-strong for long mixed password with special char', () => {
    const result = evaluatePasswordStrength('P@ssw0rd1')
    expect(result).toEqual({ className: 'very-strong', labelKey: 'profile.passwordVeryStrong' })
  })
})
