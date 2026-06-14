import { useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

let socket = null

function getSocket() {
  if (!socket) {
    socket = io(API_BASE, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
    })
  }
  return socket
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (err) {
    console.error(`[ws] localStorage.setItem(${key}) failed:`, err.message)
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

    function onConnect() {
      setConnected(true)
      console.log('[ws] connected:', s.id)
      const user = (() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
      })()
      if (user) {
        s.emit('identify', { userId: user.id, role: user.role })
      }
    }

    function onDisconnect() {
      setConnected(false)
      console.log('[ws] disconnected')
    }

    function onReqCreated(data) {
      console.log('[ws] request:created', data)
      addNotification({
        type: 'request:created',
        title: 'New Relief Request',
        message: `"${data.item?.title}" has been posted`,
        requestId: data.item?._id,
      })
    }

    function onReqUpdated(data) {
      console.log('[ws] request:updated', data)
      addNotification({
        type: 'request:updated',
        title: 'Request Updated',
        message: `A relief request has been updated`,
        requestId: data.item?._id,
      })
    }

    function onReqCommented(data) {
      console.log('[ws] request:commented', data)
      addNotification({
        type: 'request:commented',
        title: 'New Comment',
        message: `${data.comment?.createdBy?.displayName || 'Someone'} commented on a request`,
        requestId: data.requestId,
      })
    }

    function onResourceAllocated(data) {
      console.log('[ws] resource:allocated', data)
      addNotification({
        type: 'resource:allocated',
        title: 'Resource Allocated',
        message: `${data.resource?.name} allocated to a request`,
      })
    }

    function onResourceCreated(data) {
      console.log('[ws] resource:created', data)
      addNotification({
        type: 'resource:created',
        title: 'New Resource Added',
        message: `${data.item?.name || 'A resource'} has been added`,
      })
    }

    function onSosAlert(data) {
      console.log('[ws] sos:alert', data)
      addNotification({
        type: 'sos:alert',
        title: 'SOS Emergency Alert',
        message: data.message || 'Emergency broadcast received',
      })
    }

    function onReqEscalated(data) {
      console.log('[ws] request:escalated', data)
      addNotification({
        type: 'request:escalated',
        title: 'Request Escalated',
        message: `"${data.title}" has been escalated`,
        requestId: data.requestId,
      })
    }

    function onReqDeleted(data) {
      console.log('[ws] request:deleted', data)
      addNotification({
        type: 'request:deleted',
        title: 'Request Deleted',
        message: `A relief request has been deleted`,
        requestId: data.id,
      })
    }

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('request:created', onReqCreated)
    s.on('request:updated', onReqUpdated)
    s.on('request:commented', onReqCommented)
    s.on('resource:allocated', onResourceAllocated)
    s.on('resource:created', onResourceCreated)
    s.on('sos:alert', onSosAlert)
    s.on('request:escalated', onReqEscalated)
    s.on('request:deleted', onReqDeleted)

    if (!s.connected) {
      s.connect()
    }

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('request:created', onReqCreated)
      s.off('request:updated', onReqUpdated)
      s.off('request:commented', onReqCommented)
      s.off('resource:allocated', onResourceAllocated)
      s.off('resource:created', onResourceCreated)
      s.off('sos:alert', onSosAlert)
      s.off('request:escalated', onReqEscalated)
      s.off('request:deleted', onReqDeleted)
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
