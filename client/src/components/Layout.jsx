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
          <span className="pwa-install-text">Install this app for offline access</span>
          <button onClick={install} className="btnPrimary pwa-install-btn">Install</button>
          <button onClick={() => setDismissed(true)} className="pwa-dismiss-btn">&times;</button>
        </div>
      )}
    </div>
  )
}
