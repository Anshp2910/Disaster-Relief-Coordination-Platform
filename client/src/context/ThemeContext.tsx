import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  isEmergency: boolean
  setIsEmergency: (value: boolean) => void
  toggleEmergency: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark' } catch (e) { console.warn('Failed to read theme:', (e as Error).message); return 'dark' }
  })

  const [isEmergency, setIsEmergency] = useState<boolean>(() => {
    try { return localStorage.getItem('emergencyMode') === 'true' } catch (e) { console.warn('Failed to read emergency mode:', (e as Error).message); return false }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('emergency-mode', isEmergency)
    try { 
      localStorage.setItem('theme', theme) 
      localStorage.setItem('emergencyMode', isEmergency.toString())
    } catch (e) { console.warn('Failed to save settings:', (e as Error).message) }
  }, [theme, isEmergency])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])

  const toggleEmergency = useCallback(() => {
    setIsEmergency(prev => {
      const newValue = !prev
      try { localStorage.setItem('emergencyMode', newValue.toString()) } catch (e) { console.warn('Failed to save emergency mode:', (e as Error).message) }
      return newValue
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isEmergency, setIsEmergency, toggleEmergency }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: 'dark', toggleTheme: () => {}, isEmergency: false, setIsEmergency: () => {}, toggleEmergency: () => {} }
  }
  return ctx
}
