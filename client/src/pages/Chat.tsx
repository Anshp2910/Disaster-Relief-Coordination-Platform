import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Send, Paperclip, User, ChevronLeft } from 'lucide-react'
import { RippleBtn, PageTransition } from '../components/ui'
import { useSocket } from '../hooks/useSocket'
import { SkeletonList } from '../components/Skeleton'
import { clientApi } from '../api/client'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

interface Message {
  _id: string
  text: string
  type?: string
  createdAt: string
  sender?: {
    id?: string
    _id?: string
    displayName?: string
  }
  requestId?: string
}

interface TypingInfo {
  name: string
}

interface ChatProps {
  requestId: string
  onClose?: () => void
}

export default function Chat({ requestId, onClose }: ChatProps) {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { socket } = useSocket()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = useRef(0)
  const toast = useToast()

  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingInfo>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [messageError, setMessageError] = useState('')

  const loadMessages = useCallback(async (p: number) => {
    try {
      const data = (await clientApi.getChatMessages(requestId, { page: String(p), limit: '50' })) as {
        messages: Message[]
        page: number
        pages: number
      }
      if (p === 1) {
        setMessages(data.messages || [])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100)
      } else {
        setMessages((prev) => [...(data.messages || []), ...prev])
      }
      setHasMore((data.page || 1) < (data.pages || 1))
      setPage(p)
      setMessageError('')
    } catch {
      if (p === 1) setMessages([])
      setMessageError('Failed to load messages')
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

    function onMessage(data: { message?: Message }) {
      if (String(data.message?.requestId) === String(requestId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message!._id)) return prev
          return [...prev, data.message!]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }

    function onTyping(data: { sender?: { id?: string; displayName?: string }; requestId?: string; stop?: boolean }) {
      if (String(data.requestId) !== String(requestId)) return
      if (data.sender?.id === currentUser?.id) return
      const id = data.sender?.id || 'unknown'
      const name = data.sender?.displayName || 'User'
      if (data.stop) {
        setTypingUsers((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      } else {
        setTypingUsers((prev) => ({ ...prev, [id]: { name } }))
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
        }, 3000)
      }
    }

    if (socket.connected) {
      socket.emit('chat:join', { requestId })
    }

    socket.on('connect', onConnect)
    socket.on('chat:message', onMessage)
    socket.on('chat:typing', onTyping)
    return () => {
      socket.emit('chat:leave', { requestId })
      socket.off('connect', onConnect)
      socket.off('chat:message', onMessage)
      socket.off('chat:typing', onTyping)
    }
  }, [socket, requestId, currentUser?.id])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const handleTyping = useCallback(() => {
    if (!socket) return
    const now = Date.now()
    if (now - lastTypingEmitRef.current < 300) return
    lastTypingEmitRef.current = now
    socket.emit('chat:typing', { requestId, sender: { id: currentUser?.id, displayName: currentUser?.displayName || 'User' } })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { requestId, sender: { id: currentUser?.id, displayName: currentUser?.displayName || 'User' }, stop: true })
    }, 500)
  }, [socket, requestId, currentUser?.id, currentUser?.displayName])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value)
    handleTyping()
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!text.trim() && !selectedFile) || sending) return

    if (selectedFile) {
      setSending(true)
      try {
        const uploadResult = (await clientApi.uploadFiles(requestId, [selectedFile])) as { files?: { url?: string; name?: string }[] }
        const uploaded = uploadResult.files?.[0]
        if (uploaded) {
          const msg = `\uD83D\uDCCE ${uploaded.name || selectedFile.name}`
          const data = (await clientApi.sendChatMessage(requestId, msg)) as { message?: Message }
          if (data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === data.message!._id)) return prev
              return [...prev, data.message!]
            })
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          }
        }
      } catch (err) {
        toast.error((err as Error).message)
      }
      setSelectedFile(null)
      setSending(false)
      return
    }

    const msg = text.trim()
    setText('')
    setSending(true)
    try {
      const data = (await clientApi.sendChatMessage(requestId, msg)) as { message?: Message }
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data.message!._id)) return prev
          return [...prev, data.message!]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
      inputRef.current?.focus()
    } catch (err) {
      const e = err as Error
      setText(msg)
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function handleScroll() {
    const el = messagesContainerRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 300)
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleFileClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
    if (e.target) e.target.value = ''
  }

  const typingNames = Object.values(typingUsers)
  const hasTyping = typingNames.length > 0

  return (
    <PageTransition>
      <div className="flex flex-col h-100" style={{ maxHeight: 500 }}>
      <div className="flex flex-between flex-center p-sm border-bottom">
        <h3 className="m-0 text-sm text-accent-blue">{t('chat.title')}</h3>
        <div className="flex items-center gap-xs">
          {onClose && (
            <button onClick={onClose} className="bg-none border-none cursor-pointer" aria-label={t('chat.close') || 'Close chat'}>
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto flex flex-col flex-gap-sm p-sm relative"
        role="log"
        aria-live="polite"
      >
        {hasMore && (
          <button onClick={() => loadMessages(page + 1)} className="text-xs bg-none border-none cursor-pointer" style={{ color: 'var(--gov-saffron)', alignSelf: 'center' }}>
            {t('chat.loadEarlier')}
          </button>
        )}
        {loading && <SkeletonList count={4} lines={1} />}
        {!loading && messages.length === 0 && !messageError && <div className="small muted text-center">{t('chat.noMessages')}</div>}
        {messageError && <div className="small text-center" style={{ color: 'var(--danger)' }}>{messageError}</div>}

        {messages.map((m) => {
          const isMe = m.sender?.id === currentUser?.id || m.sender?._id === currentUser?.id
          const isSystem = m.type === 'system'

          if (isSystem) {
            return (
              <motion.div
                key={m._id || m.createdAt}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-center">
                  <div className="text-xs text-muted bg-accent-soft rounded-xl p-xs">
                    {m.text}
                  </div>
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={m._id || m.createdAt}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isMe ? 'justify-end' : ''}`}
            >
              <div className="max-w-75p">
                {!isMe && (
                  <div className="text-xs text-semi mb-xs flex items-center gap-xs" style={{ color: 'var(--gov-blue)' }}>
                    <User size={12} aria-hidden="true" />
                    {m.sender?.displayName || 'User'}
                  </div>
                )}
                <div className="text-sm chat-bubble" style={{
                  background: isMe ? 'var(--accent)' : 'var(--accent-soft)',
                  color: isMe ? '#fff' : 'var(--text)',
                  padding: '7px 12px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                }}>
                  {m.text}
                </div>
                <div className={`text-xs text-muted mt-xs ${isMe ? 'text-right' : ''}`}>
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </motion.div>
          )
        })}

        {hasTyping && (
          <div className="flex items-center text-xs text-muted typing-indicator">
            <span>{typingNames.map((t) => t.name).join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing</span>
            <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="scroll-to-bottom-btn"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}

      {selectedFile && (
        <div className="flex flex-gap-sm p-xs border-top bg-accent-soft items-center">
          <Paperclip size={14} aria-hidden="true" />
          <span className="text-xs flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} className="bg-none border-none cursor-pointer text-xs text-muted">&times;</button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex flex-gap-sm p-sm border-top">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="sr-only"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleFileClick}
          className="bg-none border-none cursor-pointer text-base p-0"
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <div className="ff-group flex-1 m-0">
          <div className={`ff-wrap ${text ? 'ff-focused' : ''}`} style={{ minHeight: 36 }}>
            <input
              ref={inputRef}
              value={text}
              onChange={handleInputChange}
              maxLength={2000}
              className={`ff-input p-sm ${text ? 'ff-input-filled' : ''}`}
              placeholder={t('chat.typeMessage')}
              aria-label={t('chat.typeMessage') || 'Type a message'}
            />
            <label htmlFor="chat-input" className={`ff-label ${text ? 'ff-label-float' : ''}`} style={{ top: 14 }}>
              {t('chat.typeMessage')}
            </label>
          </div>
        </div>
        <span className="text-xs text-muted self-center">{text.length}/2000</span>
        <RippleBtn type="submit" className="text-xs p-sm flex items-center gap-xs" style={{ height: 36, alignSelf: 'flex-end' }} disabled={(!text.trim() && !selectedFile) || sending}>
          {sending ? '...' : <><Send size={14} /> {t('chat.send')}</>}
        </RippleBtn>
      </form>
    </div>
    </PageTransition>
  )
}