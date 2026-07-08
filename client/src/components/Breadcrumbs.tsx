import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BreadcrumbSegment {
  label: string
  path?: string
}

const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'nav.dashboard',
  'requests': 'nav.requests',
  'resources': 'nav.resources',
  'map': 'nav.map',
  'incidents': 'nav.incidents',
  'schedules': 'nav.schedules',
  'admin': 'nav.admin',
  'profile': 'nav.profile',
  'chat': 'nav.chat',
  'zones': 'nav.zones',
  'geofencing': 'nav.geofencing',
  'escalation': 'nav.escalation',
  'bulk-import': 'nav.bulkImport',
  'new': 'common.new',
  'edit': 'common.edit',
}

export default function Breadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const pathParts = location.pathname.split('/').filter(Boolean)

  if (pathParts.length === 0) return null

  // Don't show breadcrumbs on auth pages
  if (pathParts[0] === 'login' || pathParts[0] === 'register' ||
      pathParts[0] === 'forgot-password' || pathParts[0] === 'reset-password' ||
      pathParts[0] === 'public-status') {
    return null
  }

  const segments: BreadcrumbSegment[] = [
    { label: t('nav.home') || 'Home', path: '/dashboard' },
  ]

  let currentPath = ''
  for (const part of pathParts) {
    currentPath += `/${part}`
    const labelKey = ROUTE_LABELS[part]
    if (labelKey) {
      segments.push({ label: t(labelKey), path: currentPath })
    } else {
      segments.push({ label: part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), path: currentPath })
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol className="breadcrumbs-list">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          return (
            <li key={seg.path || seg.label} className="breadcrumbs-item">
              {i === 0 && <Home size={12} className="breadcrumbs-home-icon" aria-hidden="true" />}
              {isLast ? (
                <span className="breadcrumbs-current" aria-current="page">
                  {seg.label}
                </span>
              ) : (
                <Link to={seg.path || '#'} className="breadcrumbs-link">
                  {seg.label}
                </Link>
              )}
              {!isLast && <ChevronRight size={12} className="breadcrumbs-sep" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
