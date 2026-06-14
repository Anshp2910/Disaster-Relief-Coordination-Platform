import { useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import { usePwaInstall } from '../hooks/usePwaInstall'

export default function Layout({ children }) {
  const { canInstall, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)

  return (
    <div className="gov-layout">
      <Header />
      <main className="gov-main">
        {children}
      </main>
      <Footer />
      {canInstall && !dismissed && (
        <div className="pwa-install-banner">
          <span style={{ fontSize: 14 }}>Install this app for offline access</span>
          <button
            onClick={install}
            style={{
              background: 'var(--gov-saffron)', color: '#000', border: 'none',
              padding: '6px 16px', borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none', border: 'none', color: '#ccc',
              fontSize: 18, cursor: 'pointer', padding: '0 4px',
            }}
          >
            x
          </button>
        </div>
      )}
    </div>
  )
}
