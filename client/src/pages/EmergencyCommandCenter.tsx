import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Activity, AlertTriangle, Bell, Clock, Cloud, CloudRain, CloudSnow, Compass,
  Droplets, Eye, Flame, MapPin, MessageSquare, Mic, Radio, Shield, ShieldAlert,
  Siren, Sun, Thermometer, Users, Wind, Zap, Navigation, ChevronUp, ChevronDown,
  Circle, Triangle, Square,
} from 'lucide-react'
import '../styles/10-command-center.css'

/* ── Mock Data ── */

const COUNTERS = [
  { id: 1, label: 'Active Incidents', value: 47, color: 'blue', trend: 'up', trendVal: 12 },
  { id: 2, label: 'Resources Deployed', value: 1283, color: 'cyan', trend: 'up', trendVal: 8 },
  { id: 3, label: 'Personnel Active', value: 856, color: 'green', trend: 'up', trendVal: 4 },
  { id: 4, label: 'Affected Zones', value: 23, color: 'orange', trend: 'up', trendVal: 3 },
  { id: 5, label: 'Evacuated', value: 12450, color: 'purple', trend: 'up', trendVal: 18 },
  { id: 6, label: 'Fatalities', value: 38, color: 'red', trend: 'up', trendVal: 2 },
]

const SOS_ALERTS = [
  { id: 1, title: 'Flash Flood — Zone 7B', meta: 'Mumbai, Maharashtra · Priority 1', time: '2m ago', icon: 'Flood' },
  { id: 2, title: 'Building Collapse — Sector 12', meta: 'Delhi, NCR · Priority 1', time: '7m ago', icon: 'Collapse' },
  { id: 3, title: 'Wildfire — Forest Range 4', meta: 'Uttarakhand · Priority 2', time: '14m ago', icon: 'Fire' },
]

const WEATHER = {
  temp: 32,
  condition: 'Partly Cloudy',
  humidity: 68,
  wind: '14 km/h',
  visibility: '6.2 km',
  icon: 'partly-cloudy',
}

const INCIDENTS = [
  { id: 1, title: 'Severe Flooding — Zone 7B', severity: 'Critical', location: 'Mumbai, MH', time: '12:34', resources: 24 },
  { id: 2, title: 'Building Collapse — Sector 12', severity: 'Critical', location: 'Delhi, DL', time: '11:50', resources: 18 },
  { id: 3, title: 'Wildfire — Forest Range 4', severity: 'High', location: 'Nainital, UK', time: '10:15', resources: 32 },
  { id: 4, title: 'Earthquake Aftershock', severity: 'High', location: 'Guwahati, AS', time: '09:42', resources: 45 },
]

const NOTIFICATIONS = [
  { id: 1, text: 'SOS Alert: Flash Flood reported in Zone 7B', type: 'alert', time: '12:34' },
  { id: 2, text: 'Resources dispatched to Sector 12 collapse site', type: 'info', time: '12:28' },
  { id: 3, text: 'Weather warning: Heavy rainfall predicted', type: 'warning', time: '12:15' },
  { id: 4, text: 'Medical team arrived at Zone 4 relief camp', type: 'success', time: '11:58' },
  { id: 5, text: 'Drone reconnaissance completed for Range 4', type: 'info', time: '11:40' },
  { id: 6, text: 'Critical: Dam water level rising rapidly', type: 'alert', time: '11:22' },
  { id: 7, text: 'Evacuation order issued for coastal regions', type: 'warning', time: '11:05' },
]

const TICKER_ITEMS = [
  'SYS::ALL SYSTEMS NOMINAL — SATCOM ONLINE — DRONE GRID ACTIVE',
  'WX::CYCLONE WARNING — Category 3 storm approaching eastern coast',
  'LOG::12 relief convoys dispatched in last 4 hours',
  'CMD::Emergency operations center fully activated — all stations reporting',
]

const MARKERS = [
  { x: '25%', y: '35%', color: 'red', size: 'lg', pulse: true },
  { x: '55%', y: '45%', color: 'red', size: 'lg', pulse: true },
  { x: '72%', y: '28%', color: 'orange', size: 'lg', pulse: true },
  { x: '40%', y: '65%', color: 'orange', size: 'md' },
  { x: '60%', y: '55%', color: 'blue', size: 'md' },
  { x: '80%', y: '60%', color: 'cyan', size: 'md' },
  { x: '30%', y: '50%', color: 'green', size: 'sm' },
  { x: '45%', y: '30%', color: 'blue', size: 'sm' },
  { x: '65%', y: '70%', color: 'cyan', size: 'sm' },
  { x: '85%', y: '40%', color: 'orange', size: 'sm' },
  { x: '20%', y: '70%', color: 'red', size: 'md', pulse: true },
  { x: '50%', y: '80%', color: 'green', size: 'sm' },
]

const HEATMAP_BLOBS = [
  { x: '22%', y: '32%', size: 180, color: 'red' },
  { x: '52%', y: '42%', size: 150, color: 'red' },
  { x: '38%', y: '62%', size: 120, color: 'orange' },
  { x: '70%', y: '25%', size: 140, color: 'orange' },
  { x: '60%', y: '52%', size: 100, color: 'blue' },
  { x: '80%', y: '58%', size: 80, color: 'blue' },
]

const ORBIT_RINGS = [
  { size: 100, top: '30%', left: '35%' },
  { size: 160, top: '27%', left: '32%' },
  { size: 220, top: '24%', left: '29%' },
]

/* ── Helpers ── */

function getAlertLevel() {
  const critical = SOS_ALERTS.filter(a => a.id <= 2).length
  if (critical >= 2) return { level: 'CRITICAL', class: 'critical' }
  if (critical >= 1) return { level: 'ELEVATED', class: 'elevated' }
  return { level: 'NORMAL', class: 'normal' }
}

function formatTime() {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return { hm: `${h}:${m}`, s }
}

function WeatherIcon({ condition }: { condition: string }) {
  if (condition.includes('Rain')) return <CloudRain size={24} />
  if (condition.includes('Snow')) return <CloudSnow size={24} />
  if (condition.includes('Cloud')) return <Cloud size={24} />
  if (condition.includes('Sun')) return <Sun size={24} />
  return <Cloud size={24} />
}

/* ── Component ── */

export default function EmergencyCommandCenter() {
  const { t } = useTranslation()
  const [time, setTime] = useState(formatTime())
  const [activeFeed, setActiveFeed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 1000)
    const f = setInterval(() => setActiveFeed(i => (i + 1) % NOTIFICATIONS.length), 4000)
    return () => { clearInterval(t); clearInterval(f) }
  }, [])

  const alert = getAlertLevel()

  const counterVariants = {
    hidden: { opacity: 0, y: 12 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }),
  }

  const feedVariants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  }

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
              Emergency <span>Command</span> Center
            </div>
            <div className="cc-topbar-badge">{t('commandCenter.version')} · {t('commandCenter.subtitle')}</div>
          </div>

          <div className="cc-topbar-center">
            <div className="cc-topbar-time">
              {time.hm}<span className="seconds">:{time.s}</span>
            </div>
            <div className="flex items-center gap-xs" style={{ fontSize: 10, color: '#64748b' }}>
              <span className="cc-status-dot cc-status-dot--online" />
              {t('commandCenter.statusSatcom')}
            </div>
            <div className="flex items-center gap-xs" style={{ fontSize: 10, color: '#64748b' }}>
              <span className="cc-status-dot cc-status-dot--online" />
              {t('commandCenter.statusDrone')}
            </div>
            <div className="flex items-center gap-xs" style={{ fontSize: 10, color: '#64748b' }}>
              <span className="cc-status-dot cc-status-dot--online" />
              {t('commandCenter.statusComms')}
            </div>
            <div className="flex items-center gap-xs" style={{ fontSize: 10, color: '#64748b' }}>
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
              <motion.div className="cc-counter-grid" initial="hidden" animate="show">
                {COUNTERS.map((c, i) => (
                  <motion.div key={c.id} className={`cc-counter cc-counter--${c.color}`} custom={i} variants={counterVariants}>
                    <div className="cc-counter-value">
                      {c.value.toLocaleString()}
                      {c.trend === 'up'
                        ? <ChevronUp size={12} className="trend-up" />
                        : <ChevronDown size={12} className="trend-down" />
                      }
                    </div>
                    <div className="cc-counter-label">{c.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* SOS Alerts */}
            <div className="cc-widget">
              <div className="cc-widget-header">
                <span><Siren size={12} style={{ color: '#ef4444' }} /> {t('commandCenter.sosAlerts')}</span>
                <span style={{ color: '#ef4444', fontSize: 10 }}>{SOS_ALERTS.length} {t('commandCenter.sosActive')}</span>
              </div>
              <div className="cc-sos-list">
                {SOS_ALERTS.map(a => (
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
            <div className="cc-widget">
              <div className="cc-widget-header">
                <span><Cloud size={12} className="icon" /> {t('commandCenter.weather')}</span>
                <Compass size={12} className="icon" />
              </div>
              <div className="cc-weather">
                <div className="cc-weather-icon"><WeatherIcon condition={WEATHER.condition} /></div>
                <div>
                  <div className="cc-weather-temp">{WEATHER.temp}°C</div>
                  <div className="cc-weather-desc">{WEATHER.condition}</div>
                </div>
              </div>
              <div className="cc-weather-details">
                <div className="cc-weather-detail"><Droplets size={10} /> {WEATHER.humidity}%</div>
                <div className="cc-weather-detail"><Wind size={10} /> {WEATHER.wind}</div>
                <div className="cc-weather-detail"><Eye size={10} /> {WEATHER.visibility}</div>
              </div>
            </div>

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
              {([
                { x: '25%', y: '35%', labelKey: 'locationMumbai', status: 'CRITICAL' },
                { x: '55%', y: '45%', labelKey: 'locationDelhi', status: 'CRITICAL' },
                { x: '72%', y: '28%', labelKey: 'locationNainital', status: 'HIGH' },
                { x: '40%', y: '65%', labelKey: 'locationChennai', status: 'WARNING' },
                { x: '60%', y: '55%', labelKey: 'locationKolkata', status: 'MONITOR' },
                { x: '80%', y: '60%', labelKey: 'locationGuwahati', status: 'HIGH' },
              ] as const).map((l, i) => (
                <div key={i} style={{
                  position: 'absolute', left: l.x, top: l.y, zIndex: 8, transform: 'translate(-50%, -70%)',
                  textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#e2e8f0',
                    textShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)',
                    letterSpacing: '0.04em', marginBottom: 2,
                  }}>{t(`commandCenter.${l.labelKey}`)}</div>
                  <div style={{
                    fontSize: 7, color: l.status === 'CRITICAL' ? '#ef4444' : l.status === 'HIGH' ? '#f97316' : '#0ea5e9',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    textShadow: '0 0 6px rgba(0,0,0,0.8)',
                  }}>{l.status === 'CRITICAL' ? t('commandCenter.statusCritical') : l.status === 'HIGH' ? t('commandCenter.statusHigh') : l.status === 'WARNING' ? t('commandCenter.statusWarning') : t('commandCenter.statusMonitor')}</div>
                </div>
              ))}

              {/* Heatmap blobs */}
              <div className="cc-map-overlay" style={{ zIndex: 3 }}>
                {HEATMAP_BLOBS.map((b, i) => (
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
                {MARKERS.map((m, i) => (
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
                  <span className="cc-map-legend-dot" style={{ background: '#ef4444' }} /> {t('commandCenter.mapLegendCritical')}
                </div>
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot" style={{ background: '#f97316' }} /> {t('commandCenter.mapLegendHigh')}
                </div>
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot" style={{ background: '#0ea5e9' }} /> {t('commandCenter.mapLegendActive')}
                </div>
                <div className="cc-map-legend-item">
                  <span className="cc-map-legend-dot" style={{ background: '#22c55e' }} /> {t('commandCenter.mapLegendResolved')}
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
                <span style={{ fontSize: 9, color: '#0ea5e9' }}>{t('commandCenter.live')}</span>
              </div>
              <div className="cc-feed" style={{ flex: 1, overflow: 'auto' }}>
                <AnimatedFeed items={NOTIFICATIONS} activeIndex={activeFeed} variants={feedVariants} />
              </div>
            </div>

            {/* Incidents */}
            <div className="cc-widget">
              <div className="cc-widget-header">
                <span><Flame size={12} className="icon" /> {t('commandCenter.activeIncidents')}</span>
                <span style={{ fontSize: 9, color: '#ef4444' }}>{INCIDENTS.filter(i => i.severity === 'Critical').length} {t('commandCenter.critical')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {INCIDENTS.map(inc => (
                  <motion.div
                    key={inc.id}
                    className="cc-incident-card"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="cc-incident-top">
                      <span className={`cc-incident-severity cc-incident-severity--${inc.severity.toLowerCase()}`}>
                        {inc.severity === 'Critical' ? t('commandCenter.incidentSeverityCritical') : t('commandCenter.incidentSeverityHigh')}
                      </span>
                      <span style={{ fontSize: 9, color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
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
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="cc-bottombar">
          <Mic size={12} style={{ color: '#22c55e' }} />
          <div className="cc-ticker">
            <div className="cc-ticker-track">
              {TICKER_ITEMS.map((item, i) => (
                <span key={i}>
                  <Triangle size={6} style={{ fill: '#0ea5e9', color: '#0ea5e9' }} />
                  {item}
                </span>
              ))}
              {TICKER_ITEMS.map((item, i) => (
                <span key={`dup-${i}`}>
                  <Triangle size={6} style={{ fill: '#0ea5e9', color: '#0ea5e9' }} />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="cc-bottom-status">
            <span><Circle size={6} style={{ fill: '#22c55e', color: '#22c55e' }} /> {t('commandCenter.sysOk')}</span>
            <span><Square size={6} style={{ fill: '#0ea5e9', color: '#0ea5e9' }} /> {t('commandCenter.uptime')}</span>
            <span><Activity size={10} style={{ color: '#0ea5e9' }} /> {t('commandCenter.events', { count: COUNTERS.reduce((s, c) => s + c.value, 0) })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Animated Feed Sub-component ── */

function AnimatedFeed({ items, activeIndex, variants }: {
  items: typeof NOTIFICATIONS
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
              {n.type === 'alert' ? <AlertTriangle size={10} style={{ color: '#ef4444' }} /> :
               n.type === 'warning' ? <AlertTriangle size={10} style={{ color: '#f97316' }} /> :
               n.type === 'success' ? <Activity size={10} style={{ color: '#22c55e' }} /> :
               <Bell size={10} style={{ color: '#0ea5e9' }} />}
            </span>
            <span className="cc-feed-text">{n.text}</span>
            <span className="cc-feed-time">{n.time}</span>
          </motion.div>
        )
      })}
    </>
  )
}
