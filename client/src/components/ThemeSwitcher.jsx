import { useState, useRef, useEffect, memo } from 'react'
import { useTheme, THEMES } from '../context/ThemeContext'

export default memo(function ThemeSwitcher() {
  const { themeName, changeTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const current = THEMES.find(t => t.id === themeName) || THEMES[0]

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        className="theme-switcher-btn"
        onClick={() => setOpen(o => !o)}
        title="Switch color theme"
        aria-label="Switch color theme"
        aria-expanded={open}
      >
        <span className="theme-swatch-sm" style={{ background: current.accent }} />
      </button>
      {open && (
        <div className="theme-switcher-dropdown" role="menu">
          {THEMES.map(t => (
            <button
              key={t.id}
              role="menuitem"
              className={`theme-switcher-option ${t.id === themeName ? 'active' : ''}`}
              onClick={() => { changeTheme(t.id); setOpen(false) }}
            >
              <span className="theme-swatch-sm" style={{ background: t.accent }} />
              <span className="theme-option-label">{t.name}</span>
              <span className="theme-option-check">{t.id === themeName ? '\u2713' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
