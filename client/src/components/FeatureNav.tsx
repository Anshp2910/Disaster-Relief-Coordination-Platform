import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Map, Package, MapPin,
  AlertTriangle, Calendar, Crosshair, PlusSquare,
  Shield, Upload, TrendingUp
} from 'lucide-react'

interface NavLink {
  path: string
  labelKey: string
  fallback: string
  icon: React.ReactNode
  admin?: boolean
}

const NAV_LINKS: NavLink[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', fallback: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { path: '/map', labelKey: 'nav.mapView', fallback: 'Map', icon: <Map size={16} /> },
  { path: '/resources', labelKey: 'nav.resources', fallback: 'Resources', icon: <Package size={16} /> },
  { path: '/zones', labelKey: 'nav.zones', fallback: 'Zones', icon: <MapPin size={16} /> },
  { path: '/incidents', labelKey: 'nav.incidents', fallback: 'Incidents', icon: <AlertTriangle size={16} /> },
  { path: '/schedules', labelKey: 'nav.schedules', fallback: 'Schedules', icon: <Calendar size={16} /> },
  { path: '/geofencing', labelKey: 'nav.geofencing', fallback: 'Geofencing', icon: <Crosshair size={16} /> },
  { path: '/requests/new', labelKey: 'nav.newRequest', fallback: 'New Request', icon: <PlusSquare size={16} /> },
  { path: '/escalation', labelKey: 'nav.escalation', fallback: 'Escalation', icon: <TrendingUp size={16} />, admin: true },
  { path: '/bulk', labelKey: 'nav.bulkImport', fallback: 'Bulk Import', icon: <Upload size={16} />, admin: true },
  { path: '/admin', labelKey: 'nav.admin', fallback: 'Admin', icon: <Shield size={16} />, admin: true },
]

interface FeatureNavProps {
  mobile?: boolean
}

export function FeatureNav({ mobile = false }: FeatureNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAdmin } = useAuth()

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const filteredLinks = NAV_LINKS.filter(l => !l.admin || (l.admin && isAdmin))

  const links = filteredLinks.map((link) => (
    <button
      key={link.path}
      onClick={() => { navigate(link.path) }}
      className={`${mobile ? 'gov-navbar-mobile-link' : 'gov-navbar-link'} ${isActive(link.path) ? 'active' : ''}`}
      aria-current={isActive(link.path) ? 'page' : undefined}
    >
      {link.icon}
      <span>{t(link.labelKey, link.fallback)}</span>
    </button>
  ))

  if (mobile) {
    return (
      <>
        <div className="gov-navbar-mobile-section-label">{t('nav.navigation')}</div>
        {links}
      </>
    )
  }

  return <div className="gov-navbar-links">{links}</div>
}
