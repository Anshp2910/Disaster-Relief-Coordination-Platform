import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { safeGetItem, safeSetItem } from '../utils/storage'

const ThemeContext = createContext()

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function getInitialTheme() {
  const saved = safeGetItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  if (saved === 'system') return getSystemTheme()
  return getSystemTheme()
}

function applyTheme(resolvedTheme) {
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => safeGetItem('theme') || 'system')
  const [resolvedTheme, setResolvedTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    function handleChange(e) {
      setResolvedTheme(e.matches ? 'light' : 'dark')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [mode])

  useEffect(() => {
    function handleStorage(e) {
      if (e.key !== 'theme') return
      const newMode = e.newValue || 'system'
      setMode(newMode)
      if (newMode === 'system') {
        setResolvedTheme(getSystemTheme())
      } else if (newMode === 'light' || newMode === 'dark') {
        setResolvedTheme(newMode)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setTheme = useCallback((newMode) => {
    setMode(newMode)
    safeSetItem('theme', newMode)
    if (newMode === 'system') {
      setResolvedTheme(getSystemTheme())
    } else {
      setResolvedTheme(newMode)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
