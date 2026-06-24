import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'

const COMMANDS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: '\u{1F4CA}' },
  { id: 'map', label: 'Map View', path: '/map', icon: '\u{1F5FA}' },
  { id: 'zones', label: 'Zones & Heatmap', path: '/zones', icon: '\u{1F3E0}' },
  { id: 'resources', label: 'Resources', path: '/resources', icon: '\u{1F4E6}' },
  { id: 'incidents', label: 'Incidents', path: '/incidents', icon: '\u26A0' },
  { id: 'schedules', label: 'Schedules', path: '/schedules', icon: '\u{1F4C5}' },
  { id: 'geofencing', label: 'Geofencing', path: '/geofencing', icon: '\u{1F9ED}' },
  { id: 'new-request', label: 'New Request', path: '/requests/new', icon: '\u{1F4CB}' },
  { id: 'admin', label: 'Admin Dashboard', path: '/admin', icon: '\u2699', admin: true },
  { id: 'bulk', label: 'Bulk Import', path: '/bulk', icon: '\u{1F4C2}', admin: true },
  { id: 'escalation', label: 'Escalation', path: '/escalation', icon: '\u{1F4C8}', admin: true },
  { id: 'profile', label: 'Profile', path: '/profile', icon: '\u{1F464}' },
]

export default memo(function CommandPalette({ isAdmin }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const filtered = COMMANDS.filter(c => {
    if (c.admin && !isAdmin) return false
    if (!query) return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) || c.id.includes(q)
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
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

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
      aria-label="Command palette"
    >
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrapper">
          <span className="cmd-input-icon">{'\u{1F50D}'}</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Type a command or page name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search commands"
          />
          <span className="cmd-shortcut-hint">ESC</span>
        </div>
        <div className="cmd-list" role="listbox">
          {filtered.length === 0 && (
            <div className="cmd-empty">No results for &ldquo;{query}&rdquo;</div>
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
              <span className="cmd-item-label">{cmd.label}</span>
              {cmd.admin && <span className="cmd-item-badge">Admin</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})
