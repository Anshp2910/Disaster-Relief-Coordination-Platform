import { memo } from 'react'

export const STATUS_COLORS = {
  'Open': { bg: 'rgba(0,212,255,.1)', border: 'rgba(0,212,255,.25)', text: '#00d4ff' },
  'Pending': { bg: 'rgba(142,142,147,.1)', border: 'rgba(142,142,147,.25)', text: '#8e8e93' },
  'In Progress': { bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.25)', text: '#f97316' },
  'Resolved': { bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.25)', text: '#10b981' },
  'Fulfilled': { bg: 'rgba(48,209,88,.1)', border: 'rgba(48,209,88,.25)', text: '#30d158' },
}

export const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)', text: '#ef4444' },
  'High': { bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.25)', text: '#f97316' },
  'Medium': { bg: 'rgba(255,109,46,.1)', border: 'rgba(255,109,46,.25)', text: '#ff6d2e' },
  'Low': { bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.25)', text: '#10b981' },
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
