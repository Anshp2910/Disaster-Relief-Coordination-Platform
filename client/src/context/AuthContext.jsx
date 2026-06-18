import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

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
  }, [])

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    const expiry = parseTokenExpiry()
    if (expiry && Date.now() >= expiry) {
      logout()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const expiry = parseTokenExpiry()
      if (expiry && Date.now() >= expiry) {
        logout()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, login, logout, updateUser }}>
      {children}
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
    }
  }
  return ctx
}
