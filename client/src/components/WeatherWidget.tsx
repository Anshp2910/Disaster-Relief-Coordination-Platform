import { memo } from 'react'
import { motion } from 'framer-motion'
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Droplets, Wind } from 'lucide-react'

interface WeatherData {
  temp: number
  condition: string
  humidity: number
  wind: string
}

interface WeatherWidgetProps {
  weather: WeatherData | null
  loading?: boolean
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function WeatherWidgetInner({ weather, loading = false }: WeatherWidgetProps) {
  const conditionIcon = weather?.condition?.includes('Cloud')
    ? <Cloud size={18} className="text-accent" />
    : weather?.condition?.includes('Sun') || weather?.condition?.includes('Clear')
      ? <Sun size={18} className="text-accent-orange" />
      : weather?.condition?.includes('Rain') || weather?.condition?.includes('Drizzle')
        ? <CloudRain size={18} className="text-accent-blue" />
        : weather?.condition?.includes('Snow')
          ? <CloudSnow size={18} style={{ color: 'var(--blue-300)' }} />
          : weather?.condition?.includes('Thunder') || weather?.condition?.includes('Storm')
            ? <CloudLightning size={18} style={{ color: 'var(--warning)' }} />
            : weather?.condition?.includes('Fog') || weather?.condition?.includes('Mist') || weather?.condition?.includes('Haze')
              ? <CloudFog size={18} className="text-muted" />
              : <Cloud size={18} className="text-accent" />

  return (
    <motion.div className="bento-card" variants={cardVariants}>
      <div className="flex-between mb-sm">
        <span className="bento-title">Weather</span>
        {loading ? <div className="sk-line" style={{ width: 18, height: 18, borderRadius: '50%' }} /> : conditionIcon}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="sk-line" style={{ width: '40%', height: 32 }} />
          <div className="sk-line" style={{ width: '60%', height: 14 }} />
        </div>
      ) : weather ? (
        <>
          <div className="flex items-end gap-sm">
            <span className="text-3xl font-extrabold" style={{ letterSpacing: 'var(--tracking-tight)' }}>{weather.temp}°C</span>
            <span className="text-sm mb-xs" style={{ color: 'var(--text-muted)' }}>{weather.condition}</span>
          </div>
          <div className="flex gap-md mt-sm text-xs text-muted">
            <span className="flex items-center gap-xs"><Droplets size={12} /> {weather.humidity}%</span>
            <span className="flex items-center gap-xs"><Wind size={12} /> {weather.wind}</span>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted p-md text-center">Weather unavailable</div>
      )}
    </motion.div>
  )
}

const WeatherWidget = memo(WeatherWidgetInner)
export default WeatherWidget
