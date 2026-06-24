import { memo } from 'react'

export const STATUS_COLORS = {
  'Open': { bg: 'rgba(74,128,192,.1)', border: 'rgba(74,128,192,.25)', text: '#4a80c0' },
  'Pending': { bg: 'rgba(142,142,147,.1)', border: 'rgba(142,142,147,.25)', text: '#8e8e93' },
  'In Progress': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: '#f0a030' },
  'Resolved': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: '#34c759' },
  'Fulfilled': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: '#34c759' },
}

export const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: '#ff3b30' },
  'High': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: '#f0a030' },
  'Medium': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: '#f0a030' },
  'Low': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: '#34c759' },
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
