import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSocket } from '../hooks/useSocket'
import { SkeletonList } from '../components/Skeleton'
import { clientApi } from '../api/client'
import { useToast } from '../components/Toast'

function useCurrentUser() {
  return (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()
}

export default function Chat({ requestId, onClose }) {
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const { socket } = useSocket()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const toast = useToast()

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadMessages = useCallback(async (p) => {
    try {
      const data = await clientApi.getChatMessages(requestId, { page: p, limit: 50 })
      if (p === 1) {
        setMessages(data.messages || [])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100)
      } else {
        setMessages((prev) => [...(data.messages || []), ...prev])
      }
      setHasMore((data.page || 1) < (data.pages || 1))
      setPage(p)
    } catch (err) {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    loadMessages(1)
  }, [requestId, loadMessages])

  useEffect(() => {
    if (!socket) return

    function onConnect() {
      socket.emit('chat:join', { requestId })
    }

    function onMessage(data) {
      if (String(data.message?.requestId) === String(requestId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev
          return [...prev, data.message]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }

    if (socket.connected) {
      socket.emit('chat:join', { requestId })
    }

    socket.on('connect', onConnect)
    socket.on('chat:message', onMessage)
    return () => {
      socket.emit('chat:leave', { requestId })
      socket.off('connect', onConnect)
      socket.off('chat:message', onMessage)
    }
  }, [socket, requestId])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    const msg = text.trim()
    setText('')
    setSending(true)
    try {
      const data = await clientApi.sendChatMessage(requestId, msg)
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message._id)) return prev
          return [...prev, data.message]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
      inputRef.current?.focus()
    } catch (err) {
      setText(msg)
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', maxHeight: 500 }}>
      <div className="flex flex-between flex-center" style={{ padding: '10px 12px', borderBottom: '1px solid var(--gov-border)' }}>
        <h3 className="m-0 text-sm" style={{ color: 'var(--gov-blue)' }}>{t('chat.title')}</h3>
        {onClose && (
          <button onClick={onClose} className="bg-none border-none cursor-pointer text-xl" aria-label={t('chat.close') || 'Close chat'}>
            &times;
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto flex flex-col flex-gap-sm" style={{ padding: '10px 12px' }} role="log" aria-live="polite">
        {hasMore && (
          <button onClick={() => loadMessages(page + 1)} className="text-xs bg-none border-none cursor-pointer" style={{ color: 'var(--gov-saffron)', alignSelf: 'center' }}>
            {t('chat.loadEarlier')}
          </button>
        )}
        {loading && <SkeletonList count={4} lines={1} />}
        {!loading && messages.length === 0 && <div className="small muted text-center">{t('chat.noMessages')}</div>}

        {messages.map((m) => {
          const isMe = m.sender?.id === currentUser?.id || m.sender?._id === currentUser?.id
          const isSystem = m.type === 'system'

          if (isSystem) {
            return (
              <div key={m._id || m.createdAt} className="flex flex-center">
                <div className="text-xs" style={{ color: 'var(--text-muted)', background: 'var(--accent-soft)', padding: '3px 10px', borderRadius: 12 }}>
                  {m.text}
                </div>
              </div>
            )
          }

          return (
            <div key={m._id || m.createdAt} className="flex" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%' }}>
                {!isMe && (
                  <div className="text-xs text-semi" style={{ color: 'var(--gov-blue)', marginBottom: 2 }}>
                    {m.sender?.displayName || 'User'}
                  </div>
                )}
                <div className="text-sm" style={{
                  background: isMe ? 'var(--accent)' : 'var(--accent-soft)',
                  color: isMe ? '#fff' : 'var(--text)',
                  padding: '7px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                }}>
                  {m.text}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex flex-gap-sm" style={{ padding: '10px 12px', borderTop: '1px solid var(--gov-border)' }}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('chat.typeMessage')}
          maxLength={2000}
          className="flex-1 text-sm rounded-sm"
          style={{ padding: '8px 12px', border: '1px solid var(--gov-border)' }}
        />
        <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>{text.length}/2000</span>
        <button type="submit" className="btnPrimary text-xs" disabled={!text.trim() || sending} style={{ padding: '6px 16px' }}>
          {sending ? '...' : t('chat.send')}
        </button>
      </form>
    </div>
  )
}
