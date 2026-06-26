import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AnimatedCounter } from '../components/ui'
import ErrorState from '../components/ui/ErrorState'
import { SkeletonCard, SkeletonList } from '../components/Skeleton'
import { clientApi } from '../api/client'
import { useSocket } from '../hooks/useSocket'
import {
  Activity, AlertTriangle, Bell, Cloud, CloudRain, CloudSnow, Compass,
  Droplets, Eye, Flame, MapPin, Mic, Radio, Shield, ShieldAlert,
  Siren, Sun, Users, Wind, Zap, Navigation, ChevronUp, ChevronDown,
  Circle, Triangle, Square,
} from 'lucide-react'
import '../styles/10-command-center.css'

/* ── Types ── */

interface Counter {
  id: number; label: string; value: number; color: string; trend: 'up' | 'down'; trendVal: number
}
interface SosAlert {
  id: number; title: string; meta: string; time: string; icon: string
}
interface WeatherData {
  temp: number; condition: string; humidity: number; wind: string; visibility: string; icon: string
}
interface IncidentData {
  id: number; title: string; severity: string; location: string; time: string; resources: number
}
interface NotificationItem {
  id: number; text: string; type: string; time: string
}
interface Marker { x: string; y: string; color: string; size: 'sm' | 'md' | 'lg'; pulse?: boolean }
interface HeatmapBlob { x: string; y: string; size: number; color: string }

const ORBIT_RINGS = [
  { size: 100, top: '30%', left: '35%' },
  { size: 160, top: '27%', left: '32%' },
  { size: 220, top: '24%', left: '29%' },
]

/* ── Helpers ── */

function formatTime() {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return { hm: `${h}:${m}`, s }
}

function timeAgo(dateStr: string): string {
  const sec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function formatIncidentTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function severityColor(sev: string): 'red' | 'orange' | 'blue' | 'green' | 'cyan' {
  const s = (sev || '').toLowerCase()
  if (s === 'critical' || s === 'emergency') return 'red'
  if (s === 'high') return 'orange'
  if (s === 'medium' || s === 'warning') return 'blue'
  return 'green'
}

function severityToColorName(sev: string): string {
  const s = (sev || '').toLowerCase()
  if (s === 'critical' || s === 'emergency') return 'red'
  if (s === 'high') return 'orange'
  if (s === 'medium' || s === 'warning') return 'orange'
  return 'blue'
}

function WeatherIcon({ condition }: { condition: string }) {
  const c = (condition || '').toLowerCase()
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunderstorm')) return <CloudRain size={24} />
  if (c.includes('snow') || c.includes('sleet')) return <CloudSnow size={24} />
  if (c.includes('cloud') || c.includes('overcast') || c.includes('mist') || c.includes('fog')) return <Cloud size={24} />
  if (c.includes('sun') || c.includes('clear')) return <Sun size={24} />
  return <Cloud size={24} />
}

/* ── Component ── */

export default function EmergencyCommandCenter() {
  const { t } = useTranslation()
  const [time, setTime] = useState(formatTime())

  /* ── Loading / Error state buckets ── */
  const [loadingCounters, setLoadingCounters] = useState(true)
  const [loadingSos, setLoadingSos] = useState(true)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [loadingIncidents, setLoadingIncidents] = useState(true)
  const [errorCounters, setErrorCounters] = useState('')
  const [errorSos, setErrorSos] = useState('')
  const [errorWeather, setErrorWeather] = useState('')
  const [errorIncidents, setErrorIncidents] = useState('')

  /* ── Real data state ── */
  const [counters, setCounters] = useState<Counter[]>([])
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [incidents, setIncidents] = useState<IncidentData[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [markers, setMarkers] = useState<Marker[]>([])
  const [heatmapBlobs, setHeatmapBlobs] = useState<HeatmapBlob[]>([])
  const [activeFeed, setActiveFeed] = useState(0)
  const [lastPing, setLastPing] = useState<number>(Date.now())

  /* ── Socket ── */
  const { connected: socketConnected } = useSocket()

  /* ── Data loaders ── */
  const loadCounters = useCallback(async () => {
    setLoadingCounters(true); setErrorCounters('')
    try {
      const [statsRes, resRes, zoneRes] = await Promise.allSettled([
        clientApi.adminStats(),
        clientApi.getResources({ limit: '1' }),
        clientApi.getZones({ limit: '1' }),
      ])

      const stats = statsRes.status === 'fulfilled' ? (statsRes.value as Record<string, unknown>) : {}
      const resData = resRes.status === 'fulfilled' ? (resRes.value as { total?: number }) : {}
      const zoneData = zoneRes.status === 'fulfilled' ? (zoneRes.value as { total?: number }) : {}

      const byStatus = stats.byStatus as Record<string, number> | undefined
      const openCount = (byStatus?.['Open'] || 0) + (byStatus?.['In Progress'] || 0)
      const totalUsers = (stats.totalUsers as number) || 0
      const resources = (resData as { total?: number })?.total || 0
      const zones = (zoneData as { total?: number })?.total || 0

      setCounters([
        { id: 1, label: 'Active Incidents', value: openCount || 0, color: 'blue', trend: 'up', trendVal: 0 },
        { id: 2, label: 'Resources Deployed', value: resources, color: 'cyan', trend: 'up', trendVal: 0 },
        { id: 3, label: 'Personnel Active', value: totalUsers, color: 'green', trend: 'up', trendVal: 0 },
        { id: 4, label: 'Affected Zones', value: zones, color: 'orange', trend: 'up', trendVal: 0 },
        { id: 5, label: 'Evacuated', value: (stats.evacuated as number) || 0, color: 'purple', trend: 'up', trendVal: 0 },
        { id: 6, label: 'Fatalities', value: (stats.fatalities as number) || 0, color: 'red', trend: 'up', trendVal: 0 },
      ])
    } catch (err) {
      setErrorCounters((err as Error).message)
    } finally {
      setLoadingCounters(false)
    }
  }, [])

  const loadSos = useCallback(async () => {
    setLoadingSos(true); setErrorSos('')
    try {
      const data = await clientApi.getSosAlerts({ status: 'active' }) as { items?: Record<string, unknown>[] }
      const items = data.items || []
      setSosAlerts(items.map((a, i) => ({
        id: i + 1,
        title: (a.title as string) || (a.location as string) || 'SOS Alert',
        meta: `${(a.location as string) || 'Unknown'} · Priority ${(a.priority as number) || 1}`,
        time: timeAgo((a.createdAt as string) || new Date().toISOString()),
        icon: (a.type as string) || 'Emergency',
      })))
    } catch (err) {
      setErrorSos((err as Error).message)
    } finally {
      setLoadingSos(false)
    }
  }, [])

  const loadWeather = useCallback(async () => {
    setLoadingWeather(true); setErrorWeather('')
    try {
      const data = await clientApi.getWeatherCurrent(20.5937, 78.9629) as Record<string, unknown>
      setWeather({
        temp: Math.round((data.temp as number) || 0),
        condition: (data.condition as string) || (data.description as string) || 'Unknown',
        humidity: (data.humidity as number) || 0,
        wind: (data.windSpeed as string) || `${(data.windSpeed as number) || 0} km/h`,
        visibility: (data.visibility as string) || `${(data.visibility as number) || 0} km`,
        icon: (data.icon as string) || 'cloud',
      })
    } catch (err) {
      setErrorWeather((err as Error).message)
    } finally {
      setLoadingWeather(false)
    }
  }, [])

  const loadIncidents = useCallback(async () => {
    setLoadingIncidents(true); setErrorIncidents('')
    try {
      const data = await clientApi.getIncidents({ limit: 10 }) as { items?: Record<string, unknown>[] }
      const items = data.items || []
      setIncidents(items.map((inc, i) => ({
        id: i + 1,
        title: (inc.title as string) || (inc.description as string) || 'Incident',
        severity: (inc.severity as string) || 'Medium',
        location: (inc.location as string) || (inc.address as string) || 'Unknown',
        time: formatIncidentTime((inc.createdAt as string) || new Date().toISOString()),
        resources: (inc.resourcesCount as number) || (inc.personnel as number) || 0,
      })))
    } catch (err) {
      setErrorIncidents((err as Error).message)
    } finally {
      setLoadingIncidents(false)
    }
  }, [])

  const loadMapData = useCallback(async () => {
    try {
      const [incRes, resRes] = await Promise.allSettled([
        clientApi.getIncidents({ limit: 50 }),
        clientApi.getResources({ limit: 50 }),
      ])

      const incItems = incRes.status === 'fulfilled'
        ? ((incRes.value as { items?: Record<string, unknown>[] }).items || []) : []
      const resItems = resRes.status === 'fulfilled'
        ? ((resRes.value as { items?: Record<string, unknown>[] }).items || []) : []

      const pointToPercent = (lat: number, lon: number) => {
        const top = 10, bottom = 90, left = 10, right = 90
        const latMin = 8, latMax = 37, lonMin = 68, lonMax = 97
        const x = left + ((lon - lonMin) / (lonMax - lonMin)) * (right - left)
        const y = top + ((latMax - lat) / (latMax - latMin)) * (bottom - top)
        return { x: `${Math.max(5, Math.min(95, x))}%`, y: `${Math.max(5, Math.min(95, y))}%` }
      }

      const newMarkers: Marker[] = []
      const newBlobs: HeatmapBlob[] = []

      incItems.forEach((inc) => {
        const lat = parseFloat(inc.lat as string) || parseFloat(inc.latitude as string) || 0
        const lon = parseFloat(inc.lng as string) || parseFloat(inc.longitude as string) || 0
        if (!lat || !lon) return
        const p = pointToPercent(lat, lon)
        const sev = (inc.severity as string) || 'medium'
        const col = severityColor(sev)
        const sz = sev.toLowerCase() === 'critical' || sev.toLowerCase() === 'emergency' ? 'lg' as const
               : sev.toLowerCase() === 'high' ? 'md' as const : 'sm' as const
        newMarkers.push({ x: p.x, y: p.y, color: col, size: sz, pulse: sev.toLowerCase() === 'critical' || sev.toLowerCase() === 'emergency' })
        newBlobs.push({ x: p.x, y: p.y, size: sev.toLowerCase() === 'critical' ? 180 : sev.toLowerCase() === 'high' ? 140 : 100, color: severityToColorName(sev) })
      })

      resItems.forEach((res) => {
        const lat = parseFloat(res.lat as string) || parseFloat(res.latitude as string) || 0
        const lon = parseFloat(res.lng as string) || parseFloat(res.longitude as string) || 0
        if (!lat || !lon) return
        const p = pointToPercent(lat, lon)
        newMarkers.push({ x: p.x, y: p.y, color: 'cyan', size: 'sm' })
      })

      setMarkers(newMarkers.slice(0, 30))
      setHeatmapBlobs(newBlobs.slice(0, 12))
    } catch {
      /* map data is non-critical */
    }
  }, [])

  const loadAll = useCallback(() => {
    loadCounters()
    loadSos()
    loadWeather()
    loadIncidents()
    loadMapData()
    setLastPing(Date.now())
  }, [loadCounters, loadSos, loadWeather, loadIncidents, loadMapData])

  useEffect(() => { loadAll() }, [loadAll])

  /* ── Tick timer ── */
  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── Ticker items from real status ── */
  const tickerItemsResolved = useMemo(() => {
    const items = [
      `SYS::${socketConnected ? 'SATCOM ONLINE' : 'SATCOM RECONNECTING'} — ${socketConnected ? 'DRONE GRID ACTIVE' : 'DRONE GRID STANDBY'}`,
      lastPing ? `LOG::Last API sync ${timeAgo(new Date(lastPing).toISOString())}` : 'LOG::Awaiting first data sync...',
    ]
    if (weather) {
      const wx = weather.condition
      if (wx.toLowerCase().includes('rain') || wx.toLowerCase().includes('storm')) {
        items.push(`WX::${wx.toUpperCase()} — Advisory in effect for operational zones`)
      } else {
        items.push(`WX::${wx.toUpperCase()} — ${weather.temp}°C — Conditions nominal`)
      }
    }
    if (incidents.length > 0) {
      items.push(`CMD::${incidents.length} active incidents — ${incidents.filter(i => i.severity.toLowerCase() === 'critical').length} critical`)
    }
    items.push('SYS::All stations reporting — Emergency operations center fully activated')
    return items
  }, [socketConnected, lastPing, weather, incidents])

  /* ── Notification feed from socket + polling ── */
  useEffect(() => {
    /* poll for recent requests as notifications */
    const poll = setInterval(async () => {
      try {
        const feed = await clientApi.getRequests({ limit: 3, sort: '-createdAt' }) as { items?: Record<string, unknown>[] }
        const items = feed.items || []
        items.forEach((r) => {
          setNotifications(prev => {
            if (prev.some(n => n.text.includes((r._id as string)?.slice(-6) || ''))) return prev
            const text = `Request ${(r.status as string)?.toLowerCase() === 'open' ? 'created' : 'updated'}: ${(r.title as string) || 'Request'}`
            const next: NotificationItem[] = [{ id: Date.now() + Math.random(), text, type: 'info', time: timeAgo((r.createdAt as string) || new Date().toISOString()) }, ...prev].slice(0, 20)
            return next
          })
        })
      } catch { /* ignore */ }
    }, 15000)

    return () => clearInterval(poll)
  }, [])

  /* ── Feed rotation ── */
  useEffect(() => {
    if (notifications.length === 0) return
    const f = setInterval(() => setActiveFeed(i => (i + 1) % notifications.length), 4000)
    return () => clearInterval(f)
  }, [notifications.length])

  /* ── Alert level ── */
  const alert = useMemo(() => {
    const critical = sosAlerts.length
    if (critical >= 3) return { level: 'CRITICAL', class: 'critical' as const }
    if (critical >= 1) return { level: 'ELEVATED', class: 'elevated' as const }
    return { level: 'NORMAL', class: 'normal' as const }
  }, [sosAlerts])

  const counterVariants = {
    hidden: { opacity: 0, y: 12 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }),
  }

  const feedVariants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  }

  const totalEvents = useMemo(() => counters.reduce((s, c) => s + c.value, 0), [counters])

  /* ── Location labels from incidents ── */
  const locationLabels = useMemo(() => {
    const locs = incidents.slice(0, 6).map(inc => {
      const lat = 0, lon = 0
      const top = 10, bottom = 90, left = 10, right = 90
      const latMin = 8, latMax = 37, lonMin = 68, lonMax = 97
      const x = left + ((lon - lonMin) / (lonMax - lonMin)) * (right - left)
      const y = top + ((latMax - lat) / (latMax - latMin)) * (bottom - top)
      return { x: `${Math.max(5, Math.min(95, x))}%`, y: `${Math.max(5, Math.min(95, y))}%`, label: inc.location, status: inc.severity }
    })
    if (locs.length === 0) return defaultLabels
    return locs
  }, [incidents])

  const defaultLabels = [
    { x: '25%', y: '35%', label: 'Mumbai', status: 'CRITICAL' },
    { x: '55%', y: '45%', label: 'Delhi', status: 'CRITICAL' },
    { x: '72%', y: '28%', label: 'Nainital', status: 'HIGH' },
    { x: '40%', y: '65%', label: 'Chennai', status: 'WARNING' },
    { x: '60%', y: '55%', label: 'Kolkata', status: 'MONITOR' },
    { x: '80%', y: '60%', label: 'Guwahati', status: 'HIGH' },
  ]

  return (
    <div className="cc-body">
      {/* Background */}
      <div className="cc-grid-bg" />
      <div className="cc-scanlines" />

      <div className="cc-layout">
        {/* ── Top Bar ── */}
        <header className="cc-topbar">
          <div className="cc-topbar-left">
            <div className="cc-topbar-emblem">
              <Shield size={16} />
            </div>
            <div className="cc-topbar-title">
              {t('commandCenter.title')}
            </div>
            <div className="cc-topbar-badge">{t('commandCenter.version')} · {t('commandCenter.subtitle')}</div>
          </div>

          <div className="cc-topbar-center">
            <div className="cc-topbar-time">
              {time.hm}<span className="seconds">:{time.s}</span>
            </div>
            <div className="flex items-center gap-xs cc-status-text">
              <span className="cc-status-dot cc-status-dot--online" />
              {t('commandCenter.statusSatcom')}
            </div>
            <div className="flex items-center gap-xs cc-status-text">
              <span className="cc-status-dot cc-status-dot--online" />
              {t('commandCenter.statusDrone')}
            </div>
            <div className="flex items-center gap-xs cc-status-text">
              <span className="cc-status-dot cc-status-dot--online" />
              {t('commandCenter.statusComms')}
            </div>
            <div className="flex items-center gap-xs cc-status-text">
              <span className="cc-status-dot cc-status-dot--warning" />
              {t('commandCenter.statusRadar')}
            </div>
          </div>

          <div className="cc-topbar-right">
            <div className={`cc-alert-level cc-alert-level--${alert.class}`}>
              <ShieldAlert size={12} />
              {alert.level === 'CRITICAL' ? t('commandCenter.alertCritical') : alert.level === 'ELEVATED' ? t('commandCenter.alertElevated') : t('commandCenter.alertNormal')}
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <div className="cc-main">

          {/* ── LEFT PANEL ── */}
          <div className="cc-panel cc-animate-in cc-animate-in--d1">
            {/* Live Counters */}
            <div className="cc-widget">
              <div className="cc-widget-header">
                <span>{t('commandCenter.liveStatus')}</span>
                <Activity size={12} className="icon" />
              </div>
              {loadingCounters ? (
                <SkeletonCard lines={2} />
              ) : errorCounters ? (
                <ErrorState message={errorCounters} onRetry={loadCounters} />
              ) : (
                <motion.div className="cc-counter-grid" initial="hidden" animate="show">
                  {counters.map((c, i) => (
                    <motion.div key={c.id} className={`cc-counter cc-counter--${c.color}`} custom={i} variants={counterVariants}>
                      <div className="cc-counter-value">
                        <AnimatedCounter to={c.value} duration={1.8} />
                        {c.trend === 'up'
                          ? <ChevronUp size={12} className="trend-up" />
                          : <ChevronDown size={12} className="trend-down" />
                        }
                      </div>
                      <div className="cc-counter-label">{c.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* SOS Alerts */}
            <div className="cc-widget">
              <div className="cc-widget-header">
                <span className="cc-sos-header-icon"><Siren size={12} /> {t('commandCenter.sosAlerts')}</span>
                <span className="cc-sos-count">{sosAlerts.length} {t('commandCenter.sosActive')}</span>
              </div>
              <div className="cc-sos-list">
                {loadingSos ? (
                  <SkeletonCard lines={2} />
                ) : errorSos ? (
                  <ErrorState message={errorSos} onRetry={loadSos} />
                ) : sosAlerts.length === 0 ? (
                  <div className="cc-sos-item"><div className="cc-sos-info"><div className="cc-sos-title">{t('sos.noActiveAlerts')}</div></div></div>
                ) : sosAlerts.map(a => (
                  <motion.div key={a.id} className="cc-sos-item" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <div className="cc-sos-icon"><AlertTriangle size={14} /></div>
                    <div className="cc-sos-info">
                      <div className="cc-sos-title">{a.title}</div>
                      <div className="cc-sos-meta">{a.meta}</div>
                    </div>
                    <div className="cc-sos-time">{a.time}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Weather */}
            <motion.div className="cc-widget"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            >
              <div className="cc-widget-header">
                <span><Cloud size={12} className="icon" /> {t('commandCenter.weather')}</span>
                <Compass size={12} className="icon" />
              </div>
              {loadingWeather ? (
                <SkeletonCard lines={2} />
              ) : errorWeather ? (
                <ErrorState message={errorWeather} onRetry={loadWeather} />
              ) : weather ? (
                <>
                  <div className="cc-weather">
                    <div className="cc-weather-icon"><WeatherIcon condition={weather.condition} /></div>
                    <div>
                      <div className="cc-weather-temp">{weather.temp}°C</div>
                      <div className="cc-weather-desc">{weather.condition}</div>
                    </div>
                  </div>
                  <div className="cc-weather-details">
                    <div className="cc-weather-detail"><Droplets size={10} /> {weather.humidity}%</div>
                    <div className="cc-weather-detail"><Wind size={10} /> {weather.wind}</div>
                    <div className="cc-weather-detail"><Eye size={10} /> {weather.visibility}</div>
                  </div>
                </>
              ) : <SkeletonCard lines={2} />}
            </motion.div>

            {/* Quick Actions */}
            <div className="cc-widget">
              <div className="cc-widget-header">
                <span><Zap size={12} className="icon" /> {t('commandCenter.quickActions')}</span>
              </div>
              <div className="cc-quick-actions">
                <button className="cc-quick-btn"><Radio size={10} /> {t('commandCenter.broadcast')}</button>
                <button className="cc-quick-btn"><Users size={10} /> {t('commandCenter.dispatch')}</button>
                <button className="cc-quick-btn"><Navigation size={10} /> {t('commandCenter.recon')}</button>
                <button className="cc-quick-btn cc-quick-btn--danger"><Siren size={10} /> {t('commandCenter.sosAll')}</button>
              </div>
            </div>
          </div>

          {/* ── CENTER PANEL (Map) ── */}
          <div className="cc-panel cc-panel-center cc-animate-in cc-animate-in--d2">
            <div className="cc-map">
              {/* Satellite base gradient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 30% 40%, rgba(6,11,24,0.3), rgba(6,11,24,1)), linear-gradient(180deg, rgba(6,11,24,0.5), rgba(6,11,24,1))',
                zIndex: 1,
              }} />

              {/* Topographic-style subtle contours */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2, opacity: 0.15,
                background: `radial-gradient(circle at 30% 45%, rgba(14,165,233,0.1) 0%, transparent 40%),
                            radial-gradient(circle at 60% 35%, rgba(14,165,233,0.06) 0%, transparent 35%),
                            radial-gradient(circle at 45% 60%, rgba(6,182,212,0.08) 0%, transparent 30%),
                            radial-gradient(circle at 75% 50%, rgba(14,165,233,0.04) 0%, transparent 40%)`,
              }} />

              {/* Location labels */}
              {locationLabels.map((l, i) => (
                <div key={i} style={{
                  position: 'absolute', left: l.x, top: l.y, zIndex: 8, transform: 'translate(-50%, -70%)',
                  textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#e2e8f0',
                    textShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)',
                    letterSpacing: '0.04em', marginBottom: 2,
                  }}>{l.label}</div>
                  <div style={{
                    fontSize: 7, color: l.status === 'CRITICAL' ? '#ef4444' : l.status === 'HIGH' ? '#f97316' : '#0ea5e9',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    textShadow: '0 0 6px rgba(0,0,0,0.8)',
                  }}>{l.status === 'CRITICAL' ? t('commandCenter.statusCritical') : l.status === 'HIGH' ? t('commandCenter.statusHigh') : l.status === 'WARNING' ? t('commandCenter.statusWarning') : t('commandCenter.statusMonitor')}</div>
                </div>
              ))}

              {/* Heatmap blobs */}
              <div className="cc-map-overlay" style={{ zIndex: 3 }}>
                {heatmapBlobs.map((b, i) => (
                  <div
                    key={i}
                    className={`cc-heatmap-blob cc-heatmap-blob--${b.color}`}
                    style={{ left: b.x, top: b.y, width: b.size, height: b.size, marginLeft: -b.size / 2, marginTop: -b.size / 2 }}
                  />
                ))}
              </div>

              {/* Orbit rings */}
              {ORBIT_RINGS.map((r, i) => (
                <div
                  key={i}
                  className="cc-orbit-ring"
                  style={{
                    width: r.size, height: r.size,
                    top: r.top, left: r.left,
                    marginLeft: -r.size / 2, marginTop: -r.size / 2,
                    animationDelay: `${i * 3}s`,
                    animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                  }}
                />
              ))}

              {/* Glowing markers */}
              <div className="cc-map-overlay" style={{ zIndex: 7 }}>
                {markers.map((m, i) => (
                  <div
                    key={i}
                    className={`cc-marker cc-marker--${m.color}${m.size === 'lg' ? ' cc-marker--lg' : ''}${m.pulse ? ' cc-marker--pulse' : ''}`}
                    style={{ left: m.x, top: m.y }}
                    title={`Marker ${i + 1}`}
                  />
                ))}
              </div>

              {/* Map Legend */}
              <div className="cc-map-legend">
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot cc-legend-critical" /> {t('commandCenter.mapLegendCritical')}
                </div>
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot cc-legend-high" /> {t('commandCenter.mapLegendHigh')}
                </div>
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot cc-legend-active" /> {t('commandCenter.mapLegendActive')}
                </div>
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot cc-legend-resolved" /> {t('commandCenter.mapLegendResolved')}
                </div>
              </div>

              {/* Coordinates */}
              <div className="cc-map-coords">
                {t('commandCenter.mapCoords', { lat: '19.0760', lon: '72.8777', zoom: '8' })}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="cc-panel cc-animate-in cc-animate-in--d3">
            {/* Real-time Feed */}
            <div className="cc-widget" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="cc-widget-header">
                <span><Bell size={12} className="icon" /> {t('commandCenter.realTimeFeed')}</span>
                <span className="cc-live-badge">{t('commandCenter.live')}</span>
              </div>
              <div className="cc-feed" style={{ flex: 1, overflow: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="cc-feed-item cc-feed-item--info" style={{ opacity: 0.5, justifyContent: 'center' }}>
                    <span className="cc-feed-text">{t('commandCenter.listening')}</span>
                  </div>
                ) : (
                  <AnimatedFeed items={notifications} activeIndex={activeFeed} variants={feedVariants} />
                )}
              </div>
            </div>

            {/* Incidents */}
            <motion.div className="cc-widget"
              initial="hidden"
              animate="show"
            >
              <div className="cc-widget-header">
                <span><Flame size={12} className="icon" /> {t('commandCenter.activeIncidents')}</span>
                <span className="cc-critical-badge">{incidents.filter(i => i.severity.toLowerCase() === 'critical').length} {t('commandCenter.critical')}</span>
              </div>
              {loadingIncidents ? (
                <SkeletonList count={3} lines={2} />
              ) : errorIncidents ? (
                <ErrorState message={errorIncidents} onRetry={loadIncidents} />
              ) : (
              <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
                {incidents.map(inc => (
                  <motion.div
                    key={inc.id}
                    className="cc-incident-card"
                    variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="cc-incident-top">
                      <span className={`cc-incident-severity cc-incident-severity--${inc.severity.toLowerCase()}`}>
                        {inc.severity === 'Critical' ? t('commandCenter.incidentSeverityCritical') : t('commandCenter.incidentSeverityHigh')}
                      </span>
                      <span className="cc-incident-time">
                        {inc.time}
                      </span>
                    </div>
                    <div className="cc-incident-title">{inc.title}</div>
                    <div className="cc-incident-location"><MapPin size={10} /> {inc.location}</div>
                    <div className="cc-incident-meta">
                      <span><Users size={10} /> {inc.resources} {t('commandCenter.personnel')}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="cc-bottombar">
          <Mic size={12} className="cc-bottombar-mic" />
          <div className="cc-ticker">
            <div className="cc-ticker-track">
              {tickerItemsResolved.map((item, i) => (
                <span key={i}>
                  <Triangle size={6} className="cc-ticker-icon" />
                  {item}
                </span>
              ))}
              {tickerItemsResolved.map((item, i) => (
                <span key={`dup-${i}`}>
                  <Triangle size={6} className="cc-ticker-icon" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="cc-bottom-status">
            <span className="cc-status-ok"><Circle size={6} /> {t('commandCenter.sysOk')}</span>
            <span className="cc-status-accent"><Square size={6} /> {t('commandCenter.uptime')}</span>
            <span className="cc-status-accent"><Activity size={10} /> {t('commandCenter.events', { count: totalEvents })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Animated Feed Sub-component ── */

function AnimatedFeed({ items, activeIndex, variants }: {
  items: NotificationItem[]
  activeIndex: number
  variants: { hidden: any; show: any }
}) {
  return (
    <>
      {items.map((n, i) => {
        const isActive = i === activeIndex
        const isRecent = i >= activeIndex - 1 && i <= activeIndex + 1
        return (
          <motion.div
            key={n.id}
            className={`cc-feed-item cc-feed-item--${n.type}`}
            initial="hidden"
            animate={isRecent ? "show" : "hidden"}
            variants={variants}
            style={{
              opacity: isActive ? 1 : isRecent ? 0.7 : 0.3,
              transition: 'opacity 0.3s',
            }}
          >
            <span className="cc-feed-icon">
              {n.type === 'alert' ? <AlertTriangle size={10} className="cc-feed-icon-alert" /> :
               n.type === 'warning' ? <AlertTriangle size={10} className="cc-feed-icon-warning" /> :
               n.type === 'success' ? <Activity size={10} className="cc-feed-icon-success" /> :
               <Bell size={10} className="cc-feed-icon-info" />}
            </span>
            <span className="cc-feed-text">{n.text}</span>
            <span className="cc-feed-time">{n.time}</span>
          </motion.div>
        )
      })}
    </>
  )
}
