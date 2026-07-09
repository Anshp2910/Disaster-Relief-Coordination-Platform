export function getEnv(name, fallback) {
  const value = process.env[name]
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

const MIN_JWT_SECRET_LENGTH = 32

export function getJwtSecret() {
  const secret = getEnv('JWT_SECRET')
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`)
    }
    console.warn(`WARNING: JWT_SECRET is only ${secret.length} characters. Use at least ${MIN_JWT_SECRET_LENGTH} in production.`)
  }
  return secret
}
