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
          <span style={{ fontSize: 14, fontWeight: 500 }}>Install this app for offline access</span>
          <button
            onClick={install}
            style={{
              background: 'linear-gradient(135deg, rgba(91,154,255,0.2), rgba(124,141,240,0.2))',
              color: 'var(--accent-blue)',
              border: '1px solid rgba(91,154,255,0.3)',
              padding: '6px 18px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(91,154,255,0.2)',
            }}
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            x
          </button>
        </div>
      )}
    </div>
  )
}
