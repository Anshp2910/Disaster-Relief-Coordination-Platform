import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  isEmergency: boolean
  setIsEmergency: (value: boolean) => void
  toggleEmergency: () => void
  isHighContrast: boolean
  setIsHighContrast: (value: boolean) => void
  isSocketConnected: boolean
  setIsSocketConnected: (value: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark' } catch (e) { console.warn('Failed to read theme:', (e as Error).message); return 'dark' }
  })

  const [isEmergency, setIsEmergency] = useState<boolean>(() => {
    try { return localStorage.getItem('emergencyMode') === 'true' } catch (e) { console.warn('Failed to read emergency mode:', (e as Error).message); return false }
  })

  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    try { return localStorage.getItem('highContrastMode') === 'true' } catch (e) { console.warn('Failed to read high contrast mode:', (e as Error).message); return false }
  })

  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() => {
    try { return localStorage.getItem('socketConnected') === 'true' } catch (e) { console.warn('Failed to read socket connected:', (e as Error).message); return true }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('emergency-mode', isEmergency)
    document.documentElement.classList.toggle('high-contrast', isHighContrast)
    try { 
      localStorage.setItem('theme', theme) 
      localStorage.setItem('emergencyMode', isEmergency.toString())
      localStorage.setItem('highContrastMode', isHighContrast.toString())
      localStorage.setItem('socketConnected', isSocketConnected.toString())
    } catch (e) { console.warn('Failed to save settings:', (e as Error).message) }
  }, [theme, isEmergency, isHighContrast, isSocketConnected])

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

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast(prev => {
      const newValue = !prev
      try { localStorage.setItem('highContrastMode', newValue.toString()) } catch (e) { console.warn('Failed to save high contrast mode:', (e as Error).message) }
      return newValue
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isEmergency, setIsEmergency, toggleEmergency, isHighContrast, setIsHighContrast, isSocketConnected, setIsSocketConnected }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { 
      theme: 'dark', 
      toggleTheme: () => {}, 
      isEmergency: false, 
      setIsEmergency: () => {}, 
      toggleEmergency: () => {}, 
      isHighContrast: false, 
      setIsHighContrast: () => {}, 
      isSocketConnected: true, 
      setIsSocketConnected: () => {} 
    }
  }
  return ctx
}
