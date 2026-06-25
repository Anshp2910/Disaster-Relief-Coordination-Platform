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
  if (process.env.NODE_ENV === 'production' && secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long in production`)
  }
  return secret
}
