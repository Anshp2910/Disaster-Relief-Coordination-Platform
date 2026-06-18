import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

let socket = null
const refreshListeners = new Map()
let listenerIdCounter = 0

export function registerRefreshListener(events, callback) {
  const id = ++listenerIdCounter
  refreshListeners.set(id, { events, callback })
  return () => refreshListeners.delete(id)
}

function notifyRefreshListeners(eventName) {
  refreshListeners.forEach(({ events, callback }) => {
    if (events.includes(eventName) || events.includes('*')) {
      callback()
    }
  })
}

function getSocket() {
  if (!socket) {
    const token = (() => {
      try { return localStorage.getItem('token') || null } catch { return null }
    })()
    socket = io(API_BASE || window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
      auth: { token },
    })
  }
  const storedToken = localStorage.getItem('token')
  if (socket.auth.token !== storedToken) {
    socket.auth.token = storedToken
    if (socket.connected) {
      socket.disconnect()
      socket.connect()
    }
  }
  return socket
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage full or blocked
  }
}

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('notifications') || '[]')
    } catch {
      return []
    }
  })
  const unreadCount = notifications.filter((n) => !n.read).length

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      const next = [
        { ...notification, id: Date.now() + Math.random(), read: false, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 50)
      safeSetItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    const s = getSocket()

    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }

    const handlers = {
      'request:created': (data) => { addNotification({ type: 'request:created', title: 'New Relief Request', message: `"${data.item?.title}" has been posted`, requestId: data.item?._id }); notifyRefreshListeners('request:created') },
      'request:updated': (data) => { addNotification({ type: 'request:updated', title: 'Request Updated', message: 'A relief request has been updated', requestId: data.item?._id }); notifyRefreshListeners('request:updated') },
      'request:commented': (data) => { addNotification({ type: 'request:commented', title: 'New Comment', message: `${data.comment?.createdBy?.displayName || 'Someone'} commented on a request`, requestId: data.requestId }); notifyRefreshListeners('request:commented') },
      'resource:allocated': (data) => { addNotification({ type: 'resource:allocated', title: 'Resource Allocated', message: `${data.resource?.name} allocated to a request` }); notifyRefreshListeners('resource:allocated') },
      'resource:created': (data) => { addNotification({ type: 'resource:created', title: 'New Resource Added', message: `${data.item?.name || 'A resource'} has been added` }); notifyRefreshListeners('resource:created') },
      'sos:alert': (data) => { addNotification({ type: 'sos:alert', title: 'SOS Emergency Alert', message: data.message || 'Emergency broadcast received' }); notifyRefreshListeners('sos:alert') },
      'request:escalated': (data) => { addNotification({ type: 'request:escalated', title: 'Request Escalated', message: `"${data.title}" has been escalated`, requestId: data.requestId }); notifyRefreshListeners('request:escalated') },
      'request:deleted': (data) => { addNotification({ type: 'request:deleted', title: 'Request Deleted', message: 'A relief request has been deleted', requestId: data.id }); notifyRefreshListeners('request:deleted') },
    }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    Object.entries(handlers).forEach(([event, handler]) => s.on(event, handler))

    if (!s.connected) s.connect()

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      Object.entries(handlers).forEach(([event, handler]) => s.off(event, handler))
    }
  }, [addNotification])

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      safeSetItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      safeSetItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    localStorage.removeItem('notifications')
  }, [])

  return { socket: getSocket(), connected, notifications, unreadCount, markAsRead, markAllRead, clearAll }
}
