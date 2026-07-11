import Joi from 'joi'

/**
 * Validate all environment variables at startup using a Joi schema.
 * Call this once during server initialisation.
 *
 * @returns {{ error: string | null, value: object }}  Validation result
 */
export function validateEnv() {
  const schema = Joi.object({
    NODE_ENV:        Joi.string().valid('development', 'production', 'test').default('development'),
    PORT:            Joi.number().port().default(5001),
    MONGODB_URI:     Joi.string().optional().allow('').custom((value, helpers) => {
      if (!value) return value
      const validSchemes = ['mongodb:', 'mongodb+srv:']
      try {
        const url = new URL(value)
        if (!validSchemes.includes(url.protocol)) {
          return helpers.error('any.invalid')
        }
        return value
      } catch {
        return helpers.error('any.invalid')
      }
    }, 'MongoDB URI validation').messages({
      'any.invalid': 'MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)',
    }),
    JWT_SECRET:      Joi.string().min(32).required().messages({
      'string.min': 'JWT_SECRET must be at least 32 characters long',
      'any.required': 'JWT_SECRET is required',
    }),
    CLIENT_URL:      Joi.string().uri().optional().allow(''),
    SERVER_URL:      Joi.string().uri().optional().allow(''),
    APP_NAME:        Joi.string().max(100).optional(),
    LOG_LEVEL:       Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
    RESEND_API_KEY:  Joi.string().optional().allow(''),
    RESEND_FROM:     Joi.string().optional().allow('').default('noreply@disaster-relief.app'),
    GOOGLE_CLIENT_ID:     Joi.string().optional().allow(''),
    GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
    GITHUB_CLIENT_ID:     Joi.string().optional().allow(''),
    GITHUB_CLIENT_SECRET: Joi.string().optional().allow(''),
    BUILD_VERSION:   Joi.string().optional().allow(''),
    COMMIT_SHA:      Joi.string().optional().allow(''),
  }).unknown(true) // allow other vars not in schema

  const { error, value } = schema.validate(process.env, { abortEarly: false, stripUnknown: false })

  if (error) {
    const messages = error.details.map((d) => d.message).join('; ')
    return { error: messages, value: process.env }
  }
  return { error: null, value }
}

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
