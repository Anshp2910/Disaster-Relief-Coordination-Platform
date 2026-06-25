import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const COMMANDS = [
  { id: 'dashboard', labelKey: 'nav.dashboard', path: '/dashboard', icon: '\u{1F4CA}' },
  { id: 'map', labelKey: 'nav.mapView', path: '/map', icon: '\u{1F5FA}' },
  { id: 'zones', labelKey: 'nav.zones', path: '/zones', icon: '\u{1F3E0}' },
  { id: 'resources', labelKey: 'nav.resources', path: '/resources', icon: '\u{1F4E6}' },
  { id: 'incidents', labelKey: 'nav.incidents', path: '/incidents', icon: '\u26A0' },
  { id: 'schedules', labelKey: 'nav.schedules', path: '/schedules', icon: '\u{1F4C5}' },
  { id: 'geofencing', labelKey: 'nav.geofencing', path: '/geofencing', icon: '\u{1F9ED}' },
  { id: 'new-request', labelKey: 'nav.newRequest', path: '/requests/new', icon: '\u{1F4CB}' },
  { id: 'admin', labelKey: 'nav.admin', path: '/admin', icon: '\u2699', admin: true },
  { id: 'bulk', labelKey: 'nav.bulkImport', path: '/bulk', icon: '\u{1F4C2}', admin: true },
  { id: 'escalation', labelKey: 'nav.escalation', path: '/escalation', icon: '\u{1F4C8}', admin: true },
  { id: 'profile', labelKey: 'nav.profile', path: '/profile', icon: '\u{1F464}' },
]

const FALLBACKS = {
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
  'nav.profile': 'Profile',
}

export default memo(function CommandPalette({ isAdmin }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const filtered = COMMANDS.filter(c => {
    if (c.admin && !isAdmin) return false
    if (!query) return true
    const q = query.toLowerCase()
    const label = t(c.labelKey)
    return label.toLowerCase().includes(q) || c.id.includes(q)
  })

  useEffect(() => {
    function handleKeyDown(e) {
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

  const execute = useCallback((cmd) => {
    setOpen(false)
    setQuery('')
    navigate(cmd.path)
  }, [navigate])

  function handleKeyDown(e) {
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

  if (!open) return null

  return (
    <div
      className="cmd-palette-overlay"
      onClick={() => { setOpen(false); setQuery('') }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={t('common.commandPalette')}
    >
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <span className="cmd-input-icon">{'\u{1F50D}'}</span>
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
              <span className="cmd-item-icon">{cmd.icon}</span>
              <span className="cmd-item-label">{t(cmd.labelKey, FALLBACKS[cmd.labelKey])}</span>
              {cmd.admin && <span className="cmd-item-badge">{t('common.adminBadge')}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})
