import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSocket } from '../hooks/useSocket'
import { clientApi } from '../api/client'

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

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadMessages(1)
  }, [requestId])

  useEffect(() => {
    if (!socket) return

    socket.emit('chat:join', { requestId })

    function onMessage(data) {
      if (data.message?.requestId === requestId) {
        setMessages((prev) => [...prev, data.message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }

    socket.on('chat:message', onMessage)
    return () => {
      socket.emit('chat:leave', { requestId })
      socket.off('chat:message', onMessage)
    }
  }, [socket, requestId])

  async function loadMessages(p) {
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
      console.error('Failed to load chat:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await clientApi.sendChatMessage(requestId, text.trim())
      setText('')
      inputRef.current?.focus()
    } catch (err) {
      alert(err.message)
    }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 500 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--gov-border)' }}>
        <h3 style={{ margin: 0, fontSize: 14, color: 'var(--gov-blue)' }}>Chat</h3>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            &times;
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hasMore && (
          <button onClick={() => loadMessages(page + 1)} style={{ fontSize: 11, color: 'var(--gov-saffron)', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'center' }}>
            Load earlier messages
          </button>
        )}
        {loading && <div className="small muted" style={{ textAlign: 'center' }}>Loading chat...</div>}
        {!loading && messages.length === 0 && <div className="small muted" style={{ textAlign: 'center' }}>No messages yet</div>}

        {messages.map((m) => {
          const isMe = m.sender?.id === currentUser?.id || m.sender?._id === currentUser?.id
          const isSystem = m.type === 'system'

          if (isSystem) {
            return (
              <div key={m._id || m.createdAt} style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: '#999', background: 'rgba(0,0,0,.04)', padding: '3px 10px', borderRadius: 12 }}>
                  {m.text}
                </div>
              </div>
            )
          }

          return (
            <div key={m._id || m.createdAt} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%' }}>
                {!isMe && (
                  <div style={{ fontSize: 11, color: 'var(--gov-blue)', marginBottom: 2, fontWeight: 600 }}>
                    {m.sender?.displayName || 'User'}
                  </div>
                )}
                <div style={{
                  background: isMe ? 'var(--gov-blue)' : 'rgba(0,0,0,.06)',
                  color: isMe ? 'white' : 'inherit',
                  padding: '7px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: 13,
                }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 2, textAlign: isMe ? 'right' : 'left' }}>
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--gov-border)' }}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
        />
        <button type="submit" className="btnPrimary" disabled={!text.trim()} style={{ fontSize: 12, padding: '6px 16px' }}>
          Send
        </button>
      </form>
    </div>
  )
}
