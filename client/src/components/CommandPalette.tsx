import { useState, useEffect, useRef, useCallback, memo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Map, MapPin, Package, AlertTriangle, Calendar, Crosshair, PlusSquare, Settings, Upload, TrendingUp, User, Search, Radio } from 'lucide-react'
import useFocusTrap from '../hooks/useFocusTrap'

interface Command {
  id: string
  labelKey: string
  path: string
  icon: ReactNode
  admin?: boolean
}

interface CommandPaletteProps {
  isAdmin: boolean
}

const COMMANDS: Command[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'map', labelKey: 'nav.mapView', path: '/map', icon: <Map size={16} /> },
  { id: 'zones', labelKey: 'nav.zones', path: '/zones', icon: <MapPin size={16} /> },
  { id: 'resources', labelKey: 'nav.resources', path: '/resources', icon: <Package size={16} /> },
  { id: 'incidents', labelKey: 'nav.incidents', path: '/incidents', icon: <AlertTriangle size={16} /> },
  { id: 'schedules', labelKey: 'nav.schedules', path: '/schedules', icon: <Calendar size={16} /> },
  { id: 'geofencing', labelKey: 'nav.geofencing', path: '/geofencing', icon: <Crosshair size={16} /> },
  { id: 'new-request', labelKey: 'nav.newRequest', path: '/requests/new', icon: <PlusSquare size={16} /> },
  { id: 'admin', labelKey: 'nav.admin', path: '/admin', icon: <Settings size={16} />, admin: true },
  { id: 'bulk', labelKey: 'nav.bulkImport', path: '/bulk', icon: <Upload size={16} />, admin: true },
  { id: 'escalation', labelKey: 'nav.escalation', path: '/escalation', icon: <TrendingUp size={16} />, admin: true },
  { id: 'command-center', labelKey: 'nav.commandCenter', path: '/command-center', icon: <Radio size={16} /> },
  { id: 'profile', labelKey: 'nav.profile', path: '/profile', icon: <User size={16} /> },
]

const FALLBACKS: Record<string, string> = {
  'nav.dashboard': 'Dashboard',
  'nav.mapView': 'Map View',
  'nav.zones': 'Zones',
  'nav.resources': 'Resources',
  'nav.incidents': 'Incidents',
  'nav.schedules': 'Schedules',
  'nav.geofencing': 'Geofencing',
  'nav.newRequest': 'New Request',
  'nav.admin': 'Admin Dashboard',
  'nav.bulkImport': 'Bulk Import',
  'nav.escalation': 'Escalation',
  'nav.commandCenter': 'Command Center',
  'nav.profile': 'Profile',
}

export const CommandPalette = memo(function CommandPalette({ isAdmin }: CommandPaletteProps) {

  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const trapRef = useFocusTrap(open)

  const filtered = COMMANDS.filter(c => {
    if (c.admin && !isAdmin) return false
    if (!query) return true
    const q = query.toLowerCase()
    const label = t(c.labelKey)
    return label.toLowerCase().includes(q) || c.id.includes(q)
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setHighlightIndex(0)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setQuery('')
      }
    }
    function handleCustomToggle() {
      setOpen(o => !o)
      setQuery('')
      setHighlightIndex(0)
    }
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('toggle-cmd-palette', handleCustomToggle)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('toggle-cmd-palette', handleCustomToggle)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => { setHighlightIndex(0) }, [query])

  const execute = useCallback((cmd: Command) => {
    setOpen(false)
    setQuery('')
    navigate(cmd.path)
  }, [navigate])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlightIndex]) execute(filtered[highlightIndex])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={trapRef}
          className="cmd-palette-overlay"
          onClick={() => { setOpen(false); setQuery('') }}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label={t('common.commandPalette')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="cmd-palette"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cmd-input-wrapper">
              <Search size={16} className="cmd-input-icon" />
              <input
                ref={inputRef}
                className="cmd-input"
                placeholder={t('common.typeCommand')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label={t('common.searchCommands')}
              />
              <span className="cmd-shortcut-hint">ESC</span>
            </div>
            <div className="cmd-list" role="listbox">
              {filtered.length === 0 && (
                <div className="cmd-empty">{t('common.noResultsFor', { query })}</div>
              )}
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={`cmd-item ${i === highlightIndex ? 'highlighted' : ''}`}
                  onClick={() => execute(cmd)}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <span className="cmd-item-icon" aria-hidden="true">{cmd.icon}</span>
                  <span className="cmd-item-label">{t(cmd.labelKey, FALLBACKS[cmd.labelKey])}</span>
                  {cmd.admin && <span className="cmd-item-badge">{t('common.adminBadge')}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})
