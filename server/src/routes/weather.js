import { Router } from 'express'
import { validateQuery } from '../middleware/validate.js'
import Joi from 'joi'
import { logger } from '../utils/logger.js'

const router = Router()
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1'

const weatherCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of weatherCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) weatherCache.delete(key)
  }
}, CACHE_TTL_MS)

const weatherQuery = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
})

router.get('/current', validateQuery(weatherQuery), async (req, res) => {
  try {
    const { lat, lng } = req.query
    const cacheKey = `${lat},${lng}`

    const cached = weatherCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data)
    }

    const url = `${OPEN_METEO_BASE}/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&daily=precipitation_sum&timezone=auto`

    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!resp.ok) throw new Error(`Open-Meteo returned ${resp.status}`)

    const data = await resp.json()

    const code = data.current?.weather_code ?? 0
    const conditions = WEATHER_CODES[code] || 'Unknown'

    const result = {
      temperature: data.current?.temperature_2m,
      feelsLike: data.current?.apparent_temperature,
      humidity: data.current?.relative_humidity_2m,
      precipitation: data.current?.precipitation,
      windSpeed: data.current?.wind_speed_10m,
      windGusts: data.current?.wind_gusts_10m,
      conditions,
      weatherCode: code,
      dailyPrecipitation: data.daily?.precipitation_sum?.[0],
      location: `${lat},${lng}`,
    }

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() })

    res.json(result)
  } catch (err) {
    logger.error('Weather fetch error', { message: err.message })
    res.status(502).json({ error: 'Failed to fetch weather data' })
  }
})

const WEATHER_CODES = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Slight Hail',
  99: 'Thunderstorm with Heavy Hail',
}

export default router
