import { memo } from 'react'

export const STATUS_COLORS = {
  'Open': { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--pri-400)' },
  'Pending': { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)', text: 'var(--text-muted)' },
  'In Progress': { bg: 'var(--warning-soft)', border: 'rgba(245,158,11,0.25)', text: 'var(--amber-400)' },
  'Resolved': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--green-400)' },
  'Fulfilled': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--green-400)' },
}

export const PRIORITY_COLORS = {
  'Critical': { bg: 'var(--danger-soft)', border: 'rgba(239,68,68,0.25)', text: 'var(--red-400)' },
  'High': { bg: 'var(--warning-soft)', border: 'rgba(245,158,11,0.25)', text: 'var(--amber-400)' },
  'Medium': { bg: 'var(--warning-soft)', border: 'rgba(245,158,11,0.25)', text: 'var(--amber-400)' },
  'Low': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--green-400)' },
}

export const Badge = memo(function Badge({ label }) {
  return (
    <span className="badge">
      {label}
    </span>
  )
})

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
