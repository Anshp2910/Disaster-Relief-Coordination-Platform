import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface ThemeContextType {
  theme: 'light' | 'dark' | 'neon'
  toggleTheme: () => void
  isPremium: boolean
  togglePremiumTheme: () => void
  isEmergency: boolean
  setIsEmergency: (value: boolean) => void
  toggleEmergency: () => void
  isHighContrast: boolean
  setIsHighContrast: (value: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'neon'>(() => {
    try { return (localStorage.getItem('theme') as 'light' | 'dark' | 'neon') || 'dark' } catch (e) { console.warn('Failed to read theme:', e instanceof Error ? e.message : String(e)); return 'dark' }
  })

  const [isEmergency, setIsEmergency] = useState<boolean>(() => {
    try { return localStorage.getItem('emergencyMode') === 'true' } catch (e) { console.warn('Failed to read emergency mode:', e instanceof Error ? e.message : String(e)); return false }
  })

  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    try { return localStorage.getItem('highContrastMode') === 'true' } catch (e) { console.warn('Failed to read high contrast mode:', e instanceof Error ? e.message : String(e)); return false }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('emergency-mode', isEmergency)
    document.documentElement.classList.toggle('high-contrast', isHighContrast)
    try { 
      localStorage.setItem('theme', theme) 
      localStorage.setItem('emergencyMode', isEmergency.toString())
      localStorage.setItem('highContrastMode', isHighContrast.toString())
    } catch (e) { console.warn('Failed to save settings:', e instanceof Error ? e.message : String(e)) }
  }, [theme, isEmergency, isHighContrast])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])

  // Toggle premium neon theme: switches between 'dark' and 'neon'
  const togglePremiumTheme = useCallback(() => {
    setTheme(prev => prev === 'neon' ? 'dark' : 'neon')
  }, [])

  const toggleEmergency = useCallback(() => {
    setIsEmergency(prev => !prev)
  }, [])

  const isPremium = theme === 'neon'

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, togglePremiumTheme, isPremium, isEmergency, setIsEmergency, toggleEmergency, isHighContrast, setIsHighContrast }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider. Wrap your component tree with <ThemeProvider>.')
  }
  return ctx
}
