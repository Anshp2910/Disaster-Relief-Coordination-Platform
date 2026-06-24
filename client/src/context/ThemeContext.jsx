import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext()

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function safeGetItem(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}

function getInitialTheme() {
  const saved = safeGetItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  if (saved === 'system') return getSystemTheme()
  return getSystemTheme()
}

function applyTheme(resolvedTheme) {
  document.documentElement.classList.toggle('dark', resolvedTheme === 'light')
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
