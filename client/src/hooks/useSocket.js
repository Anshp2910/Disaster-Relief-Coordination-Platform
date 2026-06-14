import { useEffect, useState, useCallback, useRef } from 'react'
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
  const notifRef = useRef(notifications)
  notifRef.current = notifications

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      const next = [
        { ...notification, id: Date.now() + Math.random(), read: false, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 50)
      localStorage.setItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    const s = getSocket()

    function onConnect() {
      setConnected(true)
      console.log('[ws] connected:', s.id)
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

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('request:created', onReqCreated)
    s.on('request:updated', onReqUpdated)
    s.on('request:commented', onReqCommented)
    s.on('resource:allocated', onResourceAllocated)

    if (!s.connected) {
      s.connect()
    } else {
      setConnected(true)
    }

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('request:created', onReqCreated)
      s.off('request:updated', onReqUpdated)
      s.off('request:commented', onReqCommented)
      s.off('resource:allocated', onResourceAllocated)
    }
  }, [addNotification])

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      localStorage.setItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      localStorage.setItem('notifications', JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    localStorage.removeItem('notifications')
  }, [])

  return { connected, notifications, unreadCount, markAsRead, markAllRead, clearAll }
}
