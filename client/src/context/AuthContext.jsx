import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import IdleWarningModal from '../components/IdleWarningModal'

const AuthContext = createContext(null)

const IDLE_TIMEOUT = 10 * 60 * 1000
const WARNING_DURATION = 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

function parseUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function parseTokenExpiry() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(parseUser)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [idleWarning, setIdleWarning] = useState(false)
  const idleRef = useRef(null)

  const isAuthenticated = !!token && !!user
  const isAdmin = user?.role === 'admin'

  const login = useCallback((tokenVal, userObj) => {
    localStorage.setItem('token', tokenVal)
    localStorage.setItem('user', JSON.stringify(userObj))
    setToken(tokenVal)
    setUser(userObj)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setIdleWarning(false)
    if (idleRef.current) clearTimeout(idleRef.current)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(next))
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

    function handleBeforeUnload() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      ACTIVITY_EVENTS.forEach((e) => document.removeEventListener(e, handleActivity))
      window.removeEventListener('beforeunload', handleBeforeUnload)
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
      token: localStorage.getItem('token'),
      isAuthenticated: !!localStorage.getItem('token'),
      isAdmin: (() => { try { return JSON.parse(localStorage.getItem('user'))?.role === 'admin' } catch { return false } })(),
      login: (t, u) => { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)) },
      logout: () => { localStorage.removeItem('token'); localStorage.removeItem('user') },
      updateUser: () => {},
      idleWarning: false,
      resetIdleTimer: () => {},
    }
  }
  return ctx
}
