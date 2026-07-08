import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { Thermometer, Plus } from 'lucide-react'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { PageHeader, ErrorState, FilterBar, PageTransition, RippleBtn } from '../components/ui'
import { SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/getErrorMessage'
import { ZoneDetailSidebar, WeatherCard, ZoneFormModal, MapLegend } from '../components/zones'
import {
  type Zone,
  type WeatherData,
  type ZoneForm,
  SEVERITY_COLORS,
  DISASTER_ICONS,
  COVERAGE_COLORS,
  SEVERITY_OPTIONS,
  DISASTER_OPTIONS,
  STATUS_OPTIONS,
  DEFAULT_FORM,
} from '../components/zones'

function buildPopup(zone: Zone, color: { fill: string }, t: (key: string) => string) {
  const coverageColor = COVERAGE_COLORS[zone.coverageStatus || ''] || 'var(--text-muted)'
  return `
    <div style="font-family:var(--font);min-width:200px">
      <div style="font-weight:700;font-size:var(--text-sm);color:var(--pri-500);margin-bottom:var(--space-3xs)">
        ${DISASTER_ICONS[zone.disasterType || ''] || ''} ${escapeHtml(zone.name || '')}
      </div>
      <div style="font-size:var(--text-xs);margin-bottom:var(--space-2xs)">
        <span style="color:${color.fill};font-weight:600">${escapeHtml(zone.severity || '')}</span> ${t('zones.severityLabel')}
        &middot; ${escapeHtml(zone.disasterType || '')}
      </div>
      <div style="font-size:var(--text-xs);margin-bottom:var(--space-3xs)">${t('zones.radiusLabel')} ${zone.radiusKm} ${t('zones.km')}</div>
      ${(zone.affectedPopulation ?? 0) > 0
        ? `<div style="font-size:var(--text-xs);margin-bottom:var(--space-3xs)">${t('zones.popupAffected')}: ${zone.affectedPopulation?.toLocaleString()}</div>`
        : ''
      }
      <hr style="margin:var(--space-2xs) 0;border:none;border-top:1px solid var(--border-light)"/>
      <div style="font-size:var(--text-xs)">
        <div>${t('zones.popupRequests')}: <strong style="color:var(--red-500)">${zone.openRequests}</strong></div>
        <div>${t('zones.popupResources')}: <strong>${zone.totalResources}</strong> ${t('zones.units')}</div>
        <div style="margin-top:var(--space-3xs)">
          ${t('zones.popupCoverage')}: <span style="background:${coverageColor};color:var(--text-on-accent);padding:var(--space-px) var(--space-2xs);border-radius:var(--radius-2xs);font-size:var(--text-3xs)">${escapeHtml(zone.coverageStatus || '')}</span>
        </div>
      </div>
      <div style="margin-top:var(--space-xs)">
        <button data-zone-id="${escapeHtml(zone._id)}" class="zone-view-btn" style="background:var(--gradient-accent);color:var(--text-on-accent);border:none;padding:var(--space-3xs) var(--space-xsml);border-radius:var(--radius-2xs);cursor:pointer;font-size:var(--text-3xs);font-weight:var(--font-weight-semibold)">${t('common.viewDetails')}</button>
      </div>
    </div>
  `
}

const containerVariants = createStagger(0.05)
const itemVariants = createListItem(10, 0.3)

export default function ZoneHeatMap() {
  useEffect(() => { document.title = 'Disaster Relief - Zones' }, [])
  const { t } = useTranslation()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editZone, setEditZone] = useState<Zone | null>(null)
  const [form, setForm] = useState<ZoneForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterDisaster, setFilterDisaster] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { confirm, ConfirmDialog } = useConfirm()

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const circlesRef = useRef<L.Circle[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { limit: 100 }
      if (filterSeverity !== 'All') params.severity = filterSeverity
      if (filterDisaster !== 'All') params.disasterType = filterDisaster
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getZones(params) as { items?: Zone[] }
      setZones(data.items || [])
    } catch (e) {
      setError(getErrorMessage(e) || 'Failed to load zones')
    } finally {
      setLoading(false)
    }
  }, [filterSeverity, filterDisaster, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  async function fetchWeather() {
    const map = mapInstanceRef.current
    if (!map) return
    try {
      setWeatherLoading(true)
      const center = map.getCenter()
      const data = await clientApi.getWeatherCurrent(Number(center.lat.toFixed(4)), Number(center.lng.toFixed(4))) as WeatherData
      setWeather(data)
    } catch {
      // silent
    } finally {
      setWeatherLoading(false)
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || loading) return

    const map = initLeafletMap(mapRef.current)
    mapInstanceRef.current = map

    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
      cleanupLeafletMap(map)
      mapInstanceRef.current = null
    }
  }, [loading])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    circlesRef.current.forEach((c) => map.removeLayer(c))
    circlesRef.current = []

    zones.forEach((zone) => {
      const color = SEVERITY_COLORS[zone.severity || 'Medium'] || SEVERITY_COLORS.Medium!
      if (!zone.centerLat || !zone.centerLng) return
      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: (zone.radiusKm || 0) * 1000,
        fillColor: color!.fill,
        fillOpacity: color!.weight,
        color: color!.stroke,
        weight: 2,
      }).addTo(map)

      circle.bindPopup(buildPopup(zone, color!, t))
      circle.on('click', () => setSelectedZone(zone))
      circlesRef.current.push(circle)
    })

    const clickHandler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.zone-view-btn') as HTMLElement | null
      if (!btn) return
      const zoneId = btn.getAttribute('data-zone-id')
      const z = zones.find((z) => z._id === zoneId)
      if (z) setSelectedZone(z)
    }

    function onPopupOpen(e: L.PopupEvent) {
      const popupEl = e.popup.getElement()
      if (popupEl) popupEl.addEventListener('click', clickHandler)
    }

    function onPopupClose(e: L.PopupEvent) {
      const popupEl = e.popup.getElement()
      if (popupEl) popupEl.removeEventListener('click', clickHandler)
    }

    map.on('popupopen', onPopupOpen)
    map.on('popupclose', onPopupClose)

    return () => {
      map.off('popupopen', onPopupOpen)
      map.off('popupclose', onPopupClose)
    }
  }, [zones, t])

  function openCreate() {
    setEditZone(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
    setSelectedZone(null)
  }

  function openEdit(zone: Zone) {
    setEditZone(zone)
    setForm({
      name: zone.name || '',
      description: zone.description || '',
      centerLat: String(zone.centerLat || ''),
      centerLng: String(zone.centerLng || ''),
      radiusKm: String(zone.radiusKm || ''),
      severity: zone.severity || 'Medium',
      status: zone.status || 'Active',
      disasterType: zone.disasterType || 'Other',
      affectedPopulation: String(zone.affectedPopulation || ''),
      notes: zone.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        centerLat: Number(form.centerLat),
        centerLng: Number(form.centerLng),
        radiusKm: Number(form.radiusKm),
        affectedPopulation: Number(form.affectedPopulation) || 0,
      }
      if (editZone) {
        await clientApi.updateZone(editZone._id, payload)
      } else {
        await clientApi.createZone(payload)
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('zones.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteZone(id)
      setSelectedZone(null)
      load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const { user: currentUser } = useAuth()
  const totalOpen = useMemo(() => zones.reduce((s, z) => s + (z.openRequests || 0), 0), [zones])
  const totalGap = useMemo(() => zones.filter((z) => z.coverageStatus === 'Gap').length, [zones])
  const totalAffected = useMemo(() => zones.reduce((s, z) => s + (z.affectedPopulation || 0), 0), [zones])

  const updateForm = (field: keyof ZoneForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const updateSelect = (field: keyof ZoneForm) => (v: string) => setForm((prev) => ({ ...prev, [field]: v }))

  return (
    <PageTransition>
      <motion.div className="container" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader
        title={t('zones.title')}
        subtitle={`${zones.length} ${t('zones.zonesCount')} \u00B7 ${totalOpen} ${t('zones.openRequests')} \u00B7 ${totalGap} ${t('zones.coverageGaps')} \u00B7 ${totalAffected.toLocaleString()} ${t('zones.affected')}`}
        actions={
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <RippleBtn className="" onClick={openCreate} aria-label={t('zones.addZone')}>
                <Plus size={16} />
                <span className="ml-xs">{t('zones.addZone')}</span>
              </RippleBtn>
            )}
            <button className="btn-secondary text-sm" onClick={fetchWeather} disabled={weatherLoading}>
              <Thermometer size={16} />
              <span className="ml-xs">{weatherLoading ? t('common.loading') : (t('zones.weather') || 'Weather')}</span>
            </button>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('zones.searchPlaceholder') || 'Search zones...'}
        filters={[
          {
            key: 'status',
            label: t('zones.statusHeader'),
            options: STATUS_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterStatus,
            onChange: setFilterStatus,
          },
          {
            key: 'severity',
            label: t('zones.severityHeader'),
            options: SEVERITY_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterSeverity,
            onChange: setFilterSeverity,
          },
          {
            key: 'disaster',
            label: t('zones.disasterHeader'),
            options: DISASTER_OPTIONS.map((d) => ({ key: d, label: d === 'All' ? t('dashboard.filterAll') : d })),
            value: filterDisaster,
            onChange: setFilterDisaster,
          },
        ]}
      />

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="flex flex-gap mt-md flex-wrap" variants={itemVariants}>
          <div className="flex-1">
            <div className="card p-0 relative">
              {loading && (
                <div className="inset-0">
                  <SkeletonMap height="65vh" />
                </div>
              )}
              {!loading && zones.length === 0 && (
                <EmptyState
                  icon={<Thermometer size={32} />}
                  title={t('zones.noZones')}
                  description={t('zones.noZonesDesc') || 'No disaster zones defined yet'}
                  action={currentUser?.role === 'admin' ? { onClick: openCreate, label: t('zones.createZone') } : undefined}
                />
              )}
              <div ref={mapRef} className="map-container-full h-65vh w-full" />
            </div>

            <MapLegend />
          </div>

          {selectedZone && (
            <ZoneDetailSidebar
              zone={selectedZone}
              onClose={() => setSelectedZone(null)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}

          {weather && (
            <WeatherCard
              weather={weather}
              loading={weatherLoading}
              onRefresh={fetchWeather}
              onClose={() => setWeather(null)}
            />
          )}
        </motion.div>
      </motion.div>

      <ZoneFormModal
        open={showForm}
        editZone={editZone}
        form={form}
        saving={saving}
        onFormChange={updateForm}
        onSelectChange={updateSelect}
        onSubmit={handleSubmit}
        onClose={() => setShowForm(false)}
      />
      {ConfirmDialog}
    </motion.div>
    </PageTransition>
  )
}
