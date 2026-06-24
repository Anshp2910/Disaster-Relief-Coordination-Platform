import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import IdleWarningModal from '../components/IdleWarningModal'

const AuthContext = createContext(null)

const IDLE_TIMEOUT = 10 * 60 * 1000
const WARNING_DURATION = 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

function safeGetItem(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}
function safeRemoveItem(key) {
  try { localStorage.removeItem(key) } catch {}
}

function parseUser() {
  try {
    return JSON.parse(safeGetItem('user') || 'null')
  } catch {
    return null
  }
}

function parseTokenExpiry() {
  try {
    const token = safeGetItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(parseUser)
  const [token, setToken] = useState(() => safeGetItem('token'))
  const [idleWarning, setIdleWarning] = useState(false)
  const idleRef = useRef(null)

  const isAuthenticated = !!token && !!user
  const isAdmin = user?.role === 'admin'

  const login = useCallback((tokenVal, userObj) => {
    safeSetItem('token', tokenVal)
    safeSetItem('user', JSON.stringify(userObj))
    setToken(tokenVal)
    setUser(userObj)
  }, [])

  const logout = useCallback(() => {
    safeRemoveItem('token')
    safeRemoveItem('user')
    setToken(null)
    setUser(null)
    setIdleWarning(false)
    if (idleRef.current) clearTimeout(idleRef.current)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates }
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

  useEffect(() => {
    const expiry = parseTokenExpiry()
    if (expiry && Date.now() >= expiry) logout()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const expiry = parseTokenExpiry()
      if (expiry && Date.now() >= expiry) logout()
    }, 60000)
    return () => clearInterval(interval)
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, login, logout, updateUser, idleWarning, resetIdleTimer }}>
      {children}
      <IdleWarningModal />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      user: parseUser(),
      token: safeGetItem('token'),
      isAuthenticated: !!safeGetItem('token'),
      isAdmin: (() => { try { return JSON.parse(safeGetItem('user') || 'null')?.role === 'admin' } catch { return false } })(),
      login: (t, u) => { safeSetItem('token', t); safeSetItem('user', JSON.stringify(u)) },
      logout: () => { safeRemoveItem('token'); safeRemoveItem('user') },
      updateUser: () => {},
      idleWarning: false,
      resetIdleTimer: () => {},
    }
  }
  return ctx
}
