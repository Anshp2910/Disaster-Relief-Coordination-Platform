import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import IdleWarningModal from '../components/IdleWarningModal'
import { safeGetItem, safeSetItem, safeRemoveItem, parseUser } from '../utils/storage'
import { clientApi } from '../api/client'

interface User {
  id?: string
  _id?: string
  email?: string
  displayName?: string
  role?: string
  phone?: string
  skills?: string[]
  notifications?: Record<string, boolean>
  [key: string]: unknown
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (tokenVal: string, userObj: User) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  idleWarning: boolean
  resetIdleTimer: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const IDLE_TIMEOUT = 10 * 60 * 1000
const WARNING_DURATION = 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

function parseTokenExpiry(): number | null {
  try {
    const token = safeGetItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]!))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => parseUser() as User | null)
  const [token, setToken] = useState<string | null>(() => safeGetItem('token'))
  const [idleWarning, setIdleWarning] = useState(false)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshingRef = useRef(false)

  const isAuthenticated = !!token && !!user
  const isAdmin = user?.role === 'admin'

  const login = useCallback((tokenVal: string, userObj: User) => {
    safeSetItem('token', tokenVal)
    safeSetItem('user', JSON.stringify(userObj))
    setToken(tokenVal)
    setUser(userObj)
    window.dispatchEvent(new Event('authchange'))
  }, [])

  const logout = useCallback(() => {
    safeRemoveItem('token')
    safeRemoveItem('user')
    safeRemoveItem('notifications')
    setToken(null)
    setUser(null)
    setIdleWarning(false)
    if (idleRef.current) clearTimeout(idleRef.current)
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
      }
    } catch { /* noop */ }
    window.dispatchEvent(new Event('authchange'))
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      const next = { ...prev, ...updates } as User
      safeSetItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  const resetIdleTimer = useCallback(() => {
    setIdleWarning(false)
    if (idleRef.current) clearTimeout(idleRef.current)
    if (!isAuthenticated) return
    idleRef.current = setTimeout(() => setIdleWarning(true), IDLE_TIMEOUT - WARNING_DURATION)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setIdleWarning(false)
      if (idleRef.current) clearTimeout(idleRef.current)
      return
    }

    function handleActivity() { resetIdleTimer() }
    ACTIVITY_EVENTS.forEach((e) => document.addEventListener(e, handleActivity, { passive: true }))
    resetIdleTimer()

    return () => {
      ACTIVITY_EVENTS.forEach((e) => document.removeEventListener(e, handleActivity))
      if (idleRef.current) clearTimeout(idleRef.current)
    }
  }, [isAuthenticated, resetIdleTimer])

  useEffect(() => {
    if (!idleWarning) return
    const t = setTimeout(() => { logout(); setIdleWarning(false) }, WARNING_DURATION)
    return () => clearTimeout(t)
  }, [idleWarning, logout])

  const refreshAuthToken = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    const currentToken = safeGetItem('token')
    if (!currentToken) { refreshingRef.current = false; return }
    try {
      const res = await clientApi.refreshToken(currentToken)
      const newToken = (res as { token: string }).token
      if (newToken) {
        safeSetItem('token', newToken)
        setToken(newToken)
        window.dispatchEvent(new Event('authchange'))
      }
    } catch {
      logout()
    } finally {
      refreshingRef.current = false
    }
  }, [logout])

  useEffect(() => {
    const expiry = parseTokenExpiry()
    if (expiry && Date.now() >= expiry) { logout(); return }
    const msUntilExpiry = expiry ? expiry - Date.now() : 0
    if (msUntilExpiry > 0 && msUntilExpiry < 300000) refreshAuthToken()
  }, [logout, refreshAuthToken])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      const expiry = parseTokenExpiry()
      if (!expiry) return
      const msUntilExpiry = expiry - Date.now()
      if (msUntilExpiry <= 0) { logout(); return }
      if (msUntilExpiry < 300000) refreshAuthToken()
    }, 60000)
    return () => clearInterval(interval)
  }, [logout, refreshAuthToken, user])

  const ctx = { user, token, isAuthenticated, isAdmin, login, logout, updateUser, idleWarning, resetIdleTimer }

  return (
    <AuthContext.Provider value={ctx}>
      {children}
      {isAuthenticated && idleWarning && <IdleWarningModal />}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider. Wrap your component tree with <AuthProvider>.')
  }
  return ctx
}
