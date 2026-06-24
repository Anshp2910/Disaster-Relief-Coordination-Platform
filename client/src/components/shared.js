import { memo } from 'react'

export const STATUS_COLORS = {
  'Open': { bg: 'rgba(91,154,255,.1)', border: 'rgba(91,154,255,.25)', text: '#5b9aff' },
  'Pending': { bg: 'rgba(142,142,147,.1)', border: 'rgba(142,142,147,.25)', text: '#8e8e93' },
  'In Progress': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: '#da9d42' },
  'Resolved': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: '#3fb950' },
  'Fulfilled': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: '#3fb950' },
}

export const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: '#f85149' },
  'High': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: '#da9d42' },
  'Medium': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: '#da9d42' },
  'Low': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: '#3fb950' },
}

export const Badge = memo(function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(142,142,147,.1)', border: 'rgba(142,142,147,.25)', text: '#8e8e93' }
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
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
