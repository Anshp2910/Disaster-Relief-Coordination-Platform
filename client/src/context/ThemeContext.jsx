import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { safeGetItem, safeSetItem } from '../utils/storage'

export const THEMES = [
  { id: 'midnight', name: 'Midnight Tactical', accent: '#3b82f6', desc: 'Default dark-mode tactical' },
  { id: 'monsoon', name: 'Monsoon', accent: '#06b6d4', desc: 'Flood response' },
  { id: 'heatwave', name: 'Heatwave', accent: '#f59e0b', desc: 'Fire season' },
  { id: 'winter', name: 'Winter', accent: '#38bdf8', desc: 'Snow relief' },
  { id: 'forest', name: 'Forest', accent: '#10b981', desc: 'ECO relief' },
  { id: 'govt', name: 'Govt Saffron', accent: '#ea580c', desc: 'Govt standard' },
  { id: 'contrast', name: 'High Contrast', accent: '#ffff00', desc: 'AAA accessibility' },
  { id: 'compact', name: 'Compact Ops', accent: '#4b7bec', desc: 'Data operator' },
]

const DEFAULT_THEME = 'midnight'

const ThemeContext = createContext()

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getInitialMode() {
  const saved = safeGetItem('theme')
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  return 'system'
}

function getInitialThemeName() {
  const saved = safeGetItem('themeName')
  if (saved && THEMES.some(t => t.id === saved)) return saved
  return DEFAULT_THEME
}

function applyTheme(themeName, resolvedTheme) {
  const root = document.documentElement
  for (const t of THEMES) root.classList.remove(`theme-${t.id}`)
  if (themeName !== 'midnight') root.classList.add(`theme-${themeName}`)
  root.classList.toggle('light', resolvedTheme === 'light')
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode)
  const [themeName, setThemeName] = useState(getInitialThemeName)
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const m = getInitialMode()
    return m === 'system' ? getSystemTheme() : m
  })

  useEffect(() => { applyTheme(themeName, resolvedTheme) }, [themeName, resolvedTheme])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    function handleChange(e) { setResolvedTheme(e.matches ? 'light' : 'dark') }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [mode])

  useEffect(() => {
    function handleStorage(e) {
      if (e.key === 'theme') {
        const newMode = e.newValue || 'system'
        setMode(newMode)
        setResolvedTheme(newMode === 'system' ? getSystemTheme() : newMode)
      }
      if (e.key === 'themeName') {
        const nv = e.newValue || DEFAULT_THEME
        if (THEMES.some(t => t.id === nv)) setThemeName(nv)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setTheme = useCallback((newMode) => {
    setMode(newMode)
    safeSetItem('theme', newMode)
    setResolvedTheme(newMode === 'system' ? getSystemTheme() : newMode)
  }, [])

  const changeTheme = useCallback((newThemeName) => {
    setThemeName(newThemeName)
    safeSetItem('themeName', newThemeName)
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, themeName, resolvedTheme, setTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
