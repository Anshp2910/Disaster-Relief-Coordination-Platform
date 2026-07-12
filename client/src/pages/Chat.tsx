import { useEffect } from 'react'
import ChatPanel from '../components/ChatPanel'

interface ChatProps {
  requestId: string
  onClose?: () => void
}

export default function Chat({ requestId, onClose }: ChatProps) {
  useEffect(() => { document.title = 'Disaster Relief - Chat' }, [])
  return <ChatPanel requestId={requestId} onClose={onClose} />
}
