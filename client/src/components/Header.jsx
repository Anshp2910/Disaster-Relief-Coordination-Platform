import { useNavigate, useLocation } from 'react-router-dom'

function AshokaChakra() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" stroke="#000080" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="4" fill="#000080" />
      {[...Array(24)].map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180
        return (
          <line
            key={i}
            x1={20}
            y1={20}
            x2={20 + 16 * Math.sin(angle)}
            y2={20 - 16 * Math.cos(angle)}
            stroke="#000080"
            strokeWidth="1.2"
          />
        )
      })}
    </svg>
  )
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const token = localStorage.getItem('token')
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const navLinks = token
    ? [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/requests/new', label: 'New Request' },
        ...(currentUser?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
      ]
    : [
        { path: '/login', label: 'Login' },
        { path: '/register', label: 'Register' },
      ]

  return (
    <header>
      <div className="gov-top-strip">
        <div className="gov-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#ccc' }}>An official website of the Disaster Relief Coordination Platform</span>
          <span style={{ fontSize: 12, color: '#ccc' }}>हिंदी</span>
        </div>
      </div>

      <div className="gov-header-main">
        <div className="gov-container" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <AshokaChakra />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#000080', lineHeight: 1.2 }}>
              Disaster Relief Coordination Platform
            </div>
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 0.5 }}>
              राहत समन्वय मंच | Government of India Initiative
            </div>
          </div>
        </div>
      </div>

      <nav className="gov-nav">
        <div className="gov-container" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`gov-nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </button>
          ))}
          {token && (
            <button onClick={logout} className="gov-nav-link" style={{ marginLeft: 'auto' }}>
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
