import { useEffect } from 'react'

export function useVersionCheck() {
  useEffect(() => {
    function handleMessage(event) {
      if (event.data?.type === 'NEW_VERSION') {
        window.location.reload()
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [])
}
