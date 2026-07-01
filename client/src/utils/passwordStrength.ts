export interface PasswordStrength {
  className: 'weak' | 'medium' | 'strong' | 'very-strong'
  labelKey: string
}

export function evaluatePasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*]/.test(password)) score++
  const classes: PasswordStrength['className'][] = ['weak', 'weak', 'weak', 'medium', 'strong', 'very-strong']
  const labelKeys = ['profile.passwordWeak', 'profile.passwordWeak', 'profile.passwordWeak', 'profile.passwordMedium', 'profile.passwordStrong', 'profile.passwordVeryStrong']
  const safeIdx = Math.min(Math.max(score, 0), classes.length - 1)
  return { className: classes[safeIdx]!, labelKey: labelKeys[safeIdx]! }
}
