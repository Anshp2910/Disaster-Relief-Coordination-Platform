export function getEnv(name, fallback) {
  const value = process.env[name]
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}
