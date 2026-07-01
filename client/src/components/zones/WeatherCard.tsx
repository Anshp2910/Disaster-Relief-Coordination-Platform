import { useTranslation } from 'react-i18next'
import { Thermometer, Activity, Droplets, Wind, X } from 'lucide-react'
import type { WeatherData } from './zoneConstants'

interface WeatherCardProps {
  weather: WeatherData
  loading: boolean
  onRefresh: () => void
  onClose: () => void
}

export default function WeatherCard({ weather, loading, onRefresh, onClose }: WeatherCardProps) {
  const { t } = useTranslation()

  return (
    <div className="card flex-shrink-0 w-280">
      <div className="flex flex-between mb-sm">
        <h4 className="m-0 text-sm text-accent-blue flex items-center gap-xs">
          <Thermometer size={14} />
          {t('zones.weather')}
        </h4>
        <button onClick={onClose} className="bg-none border-none cursor-pointer p-0" aria-label={t('common.close')}><X size={14} /></button>
      </div>
      <div className="text-lg text-bold">{weather.temperature != null ? `${weather.temperature}°C` : '--'}</div>
      <div className="text-sm text-muted mb-sm flex items-center gap-xs">
        <Activity size={14} />
        {weather.conditions} {weather.feelsLike != null ? `(${t('zones.feelsLike')} ${weather.feelsLike}°C)` : ''}
      </div>
      <div className="text-sm grid-2 gap-8">
        {weather.humidity != null && <><span className="text-muted flex items-center gap-xs"><Droplets size={14} /> {t('zones.humidity')}</span><span>{weather.humidity}%</span></>}
        {weather.windSpeed != null && <><span className="text-muted flex items-center gap-xs"><Wind size={14} /> {t('zones.wind')}</span><span>{weather.windSpeed} {t('zones.kmh')}{weather.windGusts ? ` (${t('zones.gust')} ${weather.windGusts})` : ''}</span></>}
        {weather.precipitation != null && <><span className="text-muted flex items-center gap-xs"><Droplets size={14} /> {t('zones.precipitation')}</span><span>{weather.precipitation} mm</span></>}
        {weather.dailyPrecipitation != null && <><span className="text-muted flex items-center gap-xs"><Droplets size={14} /> {t('zones.dailyTotal')}</span><span>{weather.dailyPrecipitation} mm</span></>}
      </div>
      <button onClick={onRefresh} className="text-xs mt-sm p-xs" disabled={loading}>
        {loading ? t('common.loading') : t('zones.refreshWeather') || 'Refresh'}
      </button>
    </div>
  )
}
