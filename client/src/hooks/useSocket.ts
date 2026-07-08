import { useState, useEffect, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage'
import { API_BASE } from '../api/client'
const isProduction = import.meta.env.PROD

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

function connectSocket(): void {
  const token = safeGetItem('token')
  if (!token) return

  if (socket?.connected) return

  if (!socket) {
    socket = io(API_BASE || window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: isProduction ? ['polling'] : ['polling', 'websocket'],
      withCredentials: true,
      auth: { token },
    })
  } else {
    socket.auth = { token }
  }

  if (!socket.connected) {
    socket.connect()
  }
}

function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
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
    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }
    function onConnectError(err: Error) {
      console.warn('[Socket] Connection error:', err.message)
    }

    function onAuthChange() {
      const token = safeGetItem('token')
      if (token) {
        connectSocket()
        if (socket) registerSocketHandlers(socket)
      } else {
        disconnectSocket()
        setConnected(false)
      }
    }

    function onRequestCreated(data: unknown) { const d = data as Record<string, unknown>; addNotification({ type: 'request:created', title: 'New Relief Request', message: `"${(d.item as Record<string, unknown> | undefined)?.title}" has been posted`, requestId: (d.item as Record<string, unknown> | undefined)?._id as string | undefined }); notifyRefreshListeners('request:created') }
    function onRequestUpdated(data: unknown) { const d = data as Record<string, unknown>; addNotification({ type: 'request:updated', title: 'Request Updated', message: 'A relief request has been updated', requestId: (d.item as Record<string, unknown> | undefined)?._id as string | undefined }); notifyRefreshListeners('request:updated') }
    function onRequestCommented(data: unknown) { const d = data as Record<string, unknown>; const comment = d.comment as Record<string, unknown> | undefined; const createdBy = comment?.createdBy as Record<string, unknown> | undefined; addNotification({ type: 'request:commented', title: 'New Comment', message: `${createdBy?.displayName || 'Someone'} commented on a request`, requestId: d.requestId as string | undefined }); notifyRefreshListeners('request:commented') }
    function onResourceAllocated(data: unknown) { const d = data as Record<string, unknown>; const resource = d.resource as Record<string, unknown> | undefined; addNotification({ type: 'resource:allocated', title: 'Resource Allocated', message: `${resource?.name} allocated to a request` }); notifyRefreshListeners('resource:allocated') }
    function onResourceCreated(data: unknown) { const d = data as Record<string, unknown>; addNotification({ type: 'resource:created', title: 'New Resource Added', message: `${(d.item as Record<string, unknown> | undefined)?.name || 'A resource'} has been added` }); notifyRefreshListeners('resource:created') }
    function onSosAlert(data: unknown) { const d = data as Record<string, unknown>; addNotification({ type: 'sos:alert', title: 'SOS Emergency Alert', message: (d.message as string) || 'Emergency broadcast received' }); notifyRefreshListeners('sos:alert') }
    function onRequestEscalated(data: unknown) { const d = data as Record<string, unknown>; addNotification({ type: 'request:escalated', title: 'Request Escalated', message: `"${d.title}" has been escalated`, requestId: d.requestId as string | undefined }); notifyRefreshListeners('request:escalated') }
    function onRequestDeleted(data: unknown) { const d = data as Record<string, unknown>; addNotification({ type: 'request:deleted', title: 'Request Deleted', message: 'A relief request has been deleted', requestId: d.id as string | undefined }); notifyRefreshListeners('request:deleted') }

    const registeredSockets = new Set<Socket>()

    function registerSocketHandlers(s: Socket) {
      if (registeredSockets.has(s)) return
      registeredSockets.add(s)
      s.on('connect', onConnect)
      s.on('disconnect', onDisconnect)
      s.on('connect_error', onConnectError)
      s.on('request:created', onRequestCreated)
      s.on('request:updated', onRequestUpdated)
      s.on('request:commented', onRequestCommented)
      s.on('resource:allocated', onResourceAllocated)
      s.on('resource:created', onResourceCreated)
      s.on('sos:alert', onSosAlert)
      s.on('request:escalated', onRequestEscalated)
      s.on('request:deleted', onRequestDeleted)
    }

    window.addEventListener('authchange', onAuthChange)

    const s = (() => { connectSocket(); return socket })()
    if (s) registerSocketHandlers(s)

    return () => {
      if (s) {
        registeredSockets.delete(s)
        s.off('connect', onConnect)
        s.off('disconnect', onDisconnect)
        s.off('connect_error', onConnectError)
        s.off('request:created', onRequestCreated)
        s.off('request:updated', onRequestUpdated)
        s.off('request:commented', onRequestCommented)
        s.off('resource:allocated', onResourceAllocated)
        s.off('resource:created', onResourceCreated)
        s.off('sos:alert', onSosAlert)
        s.off('request:escalated', onRequestEscalated)
        s.off('request:deleted', onRequestDeleted)
        disconnectSocket()
      }
      socket = null
      setConnected(false)
      window.removeEventListener('authchange', onAuthChange)
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

  return { socket, connected, notifications, unreadCount, markAsRead, markAllRead, clearAll }
}
