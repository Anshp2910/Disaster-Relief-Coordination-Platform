export const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Open': { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--color-open)' },
  'Pending': { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: 'var(--color-pending)' },
  'In Progress': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-progress)' },
  'Resolved': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-resolved)' },
  'Fulfilled': { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', text: 'var(--color-fulfilled)' },
}

export const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Critical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: 'var(--color-critical)' },
  'High': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--color-high)' },
  'Medium': { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--color-medium)' },
  'Low': { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
}

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Medical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: 'var(--cat-medical)' },
  'Food': { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', text: 'var(--cat-food)' },
  'Shelter': { bg: 'rgba(74,128,192,.1)', border: 'rgba(74,128,192,.25)', text: 'var(--cat-shelter)' },
  'Water': { bg: 'rgba(6,182,212,.1)', border: 'rgba(6,182,212,.25)', text: 'var(--cat-water)' },
  'Rescue': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--cat-rescue)' },
  'Supplies': { bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.25)', text: 'var(--cat-supplies)' },
  'Healthcare': { bg: 'rgba(236,72,153,.1)', border: 'rgba(236,72,153,.25)', text: 'var(--cat-healthcare)' },
  'Sanitation': { bg: 'rgba(20,184,166,.1)', border: 'rgba(20,184,166,.25)', text: 'var(--cat-sanitation)' },
  'Clothing': { bg: 'rgba(168,85,247,.1)', border: 'rgba(168,85,247,.25)', text: 'var(--cat-clothing)' },
  'Transportation': { bg: 'rgba(99,102,241,.1)', border: 'rgba(99,102,241,.25)', text: 'var(--cat-transportation)' },
  'Communication': { bg: 'rgba(14,165,233,.1)', border: 'rgba(14,165,233,.25)', text: 'var(--cat-communication)' },
  'Power': { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--cat-power)' },
  'Infrastructure': { bg: 'rgba(100,116,139,.1)', border: 'rgba(100,116,139,.25)', text: 'var(--cat-infrastructure)' },
  'Other': { bg: 'rgba(156,163,175,.1)', border: 'rgba(156,163,175,.25)', text: 'var(--cat-other)' },
}

export const MAP_MARKER_COLORS: Record<string, string> = {
  'Open': 'var(--color-open)',
  'Pending': 'var(--color-pending)',
  'In Progress': 'var(--color-progress)',
  'Resolved': 'var(--color-resolved)',
  'Fulfilled': 'var(--color-fulfilled)',
}

export const SHIFT_COLORS: Record<string, string> = {
  morning: 'var(--cat-rescue)',
  afternoon: 'var(--color-open)',
  night: 'var(--cat-supplies)',
}

export const RESOURCE_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Available: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
  Low: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', text: 'var(--color-high)' },
  Depleted: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)', text: 'var(--color-critical)' },
  Reserved: { bg: 'rgba(129,140,248,.1)', border: 'rgba(129,140,248,.25)', text: 'var(--accent-indigo)' },
}

export const COLORS_FALLBACK = { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: 'var(--gov-muted)' }

export const STATUS_OPTIONS = ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']
export const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
export const CATEGORY_OPTIONS = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
export const RESOURCE_STATUS_OPTIONS = ['Available', 'Deployed', 'Maintenance']
