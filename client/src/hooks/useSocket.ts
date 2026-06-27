import { useState, useEffect, useCallback, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

let socket: Socket | null = null

interface RefreshListener {
  events: string[]
  callback: () => void
}

const refreshListeners = new Map<number, RefreshListener>()
let listenerIdCounter = 0

export function registerRefreshListener(events: string[], callback: () => void): () => void {
  const id = ++listenerIdCounter
  refreshListeners.set(id, { events, callback })
  return () => refreshListeners.delete(id)
}

function notifyRefreshListeners(eventName: string): void {
  refreshListeners.forEach(({ events, callback }) => {
    if (events.includes(eventName) || events.includes('*')) {
      callback()
    }
  })
}

function getSocket(): Socket {
  if (!socket) {
    const token = safeGetItem('token')
    socket = io(API_BASE || window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
      auth: { token },
    })
  }
  const storedToken = safeGetItem('token')
  const auth = socket.auth as Record<string, unknown>
  if (auth.token !== storedToken) {
    auth.token = storedToken
    if (socket.connected) {
      socket.disconnect()
      socket.connect()
    }
  }
  return socket
}

interface Notification {
  id: number
  read: boolean
  timestamp: string
  type: string
  title: string
  message: string
  requestId?: string
}

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      return JSON.parse(safeGetItem('notifications') || '[]')
    } catch {
      return []
    }
  })
  const unreadCount = notifications.filter((n) => !n.read).length
  const socketRef = useRef<Socket | null>(getSocket())

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    setNotifications((prev) => {
      const next: Notification[] = [
        { ...notification, id: Date.now() + Math.random(), read: false, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 50)
      safeSetItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    const s = socketRef.current || getSocket()

    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }

    interface Handlers {
      [event: string]: (data: unknown) => void
    }

    const handlers: Handlers = {
      'request:created': (data: unknown) => { const d = data as Record<string, unknown>; addNotification({ type: 'request:created', title: 'New Relief Request', message: `"${(d.item as Record<string, unknown> | undefined)?.title}" has been posted`, requestId: (d.item as Record<string, unknown> | undefined)?._id as string | undefined }); notifyRefreshListeners('request:created') },
      'request:updated': (data: unknown) => { const d = data as Record<string, unknown>; addNotification({ type: 'request:updated', title: 'Request Updated', message: 'A relief request has been updated', requestId: (d.item as Record<string, unknown> | undefined)?._id as string | undefined }); notifyRefreshListeners('request:updated') },
      'request:commented': (data: unknown) => { const d = data as Record<string, unknown>; const comment = d.comment as Record<string, unknown> | undefined; const createdBy = comment?.createdBy as Record<string, unknown> | undefined; addNotification({ type: 'request:commented', title: 'New Comment', message: `${createdBy?.displayName || 'Someone'} commented on a request`, requestId: d.requestId as string | undefined }); notifyRefreshListeners('request:commented') },
      'resource:allocated': (data: unknown) => { const d = data as Record<string, unknown>; const resource = d.resource as Record<string, unknown> | undefined; addNotification({ type: 'resource:allocated', title: 'Resource Allocated', message: `${resource?.name} allocated to a request` }); notifyRefreshListeners('resource:allocated') },
      'resource:created': (data: unknown) => { const d = data as Record<string, unknown>; addNotification({ type: 'resource:created', title: 'New Resource Added', message: `${(d.item as Record<string, unknown> | undefined)?.name || 'A resource'} has been added` }); notifyRefreshListeners('resource:created') },
      'sos:alert': (data: unknown) => { const d = data as Record<string, unknown>; addNotification({ type: 'sos:alert', title: 'SOS Emergency Alert', message: (d.message as string) || 'Emergency broadcast received' }); notifyRefreshListeners('sos:alert') },
      'request:escalated': (data: unknown) => { const d = data as Record<string, unknown>; addNotification({ type: 'request:escalated', title: 'Request Escalated', message: `"${d.title}" has been escalated`, requestId: d.requestId as string | undefined }); notifyRefreshListeners('request:escalated') },
      'request:deleted': (data: unknown) => { const d = data as Record<string, unknown>; addNotification({ type: 'request:deleted', title: 'Request Deleted', message: 'A relief request has been deleted', requestId: d.id as string | undefined }); notifyRefreshListeners('request:deleted') },
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

  const markAsRead = useCallback((id: number) => {
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
    safeRemoveItem('notifications')
  }, [])

  return { socket: socketRef.current, connected, notifications, unreadCount, markAsRead, markAllRead, clearAll }
}
