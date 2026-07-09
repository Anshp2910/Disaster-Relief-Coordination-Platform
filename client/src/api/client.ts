import { safeGetItem, safeRemoveItem } from '../utils/storage'

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL || ''
let redirectingToLogin = false

function getToken(): string | null {
  return safeGetItem('token')
}

function toSearchParams(params: Record<string, string | number | boolean | undefined | null>): string {
  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = String(value)
    }
  }
  const qs = new URLSearchParams(cleaned).toString()
  return qs ? '?' + qs : ''
}

interface ApiFetchOptions {
  method?: string
  body?: unknown
  auth?: boolean
  formData?: boolean
  timeout?: number
}

async function apiFetch<T = Record<string, unknown>>(path: string, { method = 'GET', body, auth = true, formData = false, timeout = 15000 }: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (!formData) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: formData ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timer)

    const data: Record<string, unknown> = await res.json().catch(() => ({}))
    if (!res.ok) {
  if (res.status === 401 && auth) {
    safeRemoveItem('token')
    safeRemoveItem('user')
    if (!redirectingToLogin && !window.location.hash.startsWith('#/login') && !window.location.hash.startsWith('#/register')) {
      redirectingToLogin = true
      window.location.hash = '#/login'
      setTimeout(() => { redirectingToLogin = false }, 5000)
    }
  }
      const msg = (data?.error as string) || `Request failed with status ${res.status}`
      throw new Error(msg)
    }
    return data as T
  } catch (err) {
    clearTimeout(timer)
    const errObj = err instanceof Error ? err : new Error(String(err))
    if (errObj.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    if (errObj.message === 'Failed to fetch' || errObj.name === 'TypeError') {
      throw new Error('Unable to connect to the server. Please ensure the backend is running and try again.')
    }
    throw err
  }
}

async function exportCSV(path: string, filename: string): Promise<void> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    safeRemoveItem('token'); safeRemoveItem('user')
    window.location.hash = '#/login'
    throw new Error('Session expired')
  }
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Wait for download to start before revoking
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

export const clientApi = {
  register: (payload: Record<string, unknown>) => apiFetch('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload: Record<string, unknown>) => apiFetch('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (email: string) => apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token: string, password: string) => apiFetch('/api/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),
  refreshToken: (token: string) => apiFetch('/api/auth/refresh', { method: 'POST', body: { token }, auth: false }),
  me: () => apiFetch('/api/auth/me'),
  updateProfile: (payload: Record<string, unknown>) => apiFetch('/api/auth/profile', { method: 'PUT', body: payload }),
  getNotifications: () => apiFetch('/api/auth/notifications'),
  updateNotifications: (payload: Record<string, unknown>) => apiFetch('/api/auth/notifications', { method: 'PUT', body: payload }),

  getRequests: (params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/requests${toSearchParams(params)}`)
  },
  getRequest: (id: string) => apiFetch(`/api/requests/${id}`),
  createRequest: (payload: Record<string, unknown>) => apiFetch('/api/requests', { method: 'POST', body: payload }),
  updateRequest: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/requests/${id}`, { method: 'PUT', body: payload }),
  deleteRequest: (id: string) => apiFetch(`/api/requests/${id}`, { method: 'DELETE' }),
  claimRequest: (id: string) => apiFetch(`/api/requests/${id}/claim`, { method: 'POST' }),
  unclaimRequest: (id: string) => apiFetch(`/api/requests/${id}/unclaim`, { method: 'POST' }),
  addComment: (id: string, text: string) => apiFetch(`/api/requests/${id}/comments`, { method: 'POST', body: { text } }),
  deleteComment: (id: string, commentId: string) => apiFetch(`/api/requests/${id}/comments/${commentId}`, { method: 'DELETE' }),
  updateComment: (id: string, commentId: string, text: string) => apiFetch(`/api/requests/${id}/comments/${commentId}`, { method: 'PUT', body: { text } }),
  deleteFile: (requestId: string, fileId: string) => apiFetch(`/api/requests/${requestId}/files/${fileId}`, { method: 'DELETE' }),
  uploadFiles: async (id: string, files: File[]) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    return apiFetch(`/api/requests/${id}/files`, { method: 'POST', body: formData, formData: true })
  },

  adminStats: () => apiFetch('/api/admin/stats'),
  adminUsers: () => apiFetch('/api/admin/users'),
  adminRequests: (params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/admin/requests${toSearchParams(params)}`)
  },
  adminUpdateUserRole: (id: string, role: string) => apiFetch(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  adminDeleteUser: (id: string) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminDeleteRequest: (id: string) => apiFetch(`/api/admin/requests/${id}`, { method: 'DELETE' }),
  adminExportRequests: (format: string = 'json') => {
    if (format === 'csv') return exportCSV('/api/admin/export/requests?format=csv', 'requests-export.csv')
    return apiFetch(`/api/admin/export/requests?format=${format}`)
  },
  adminSeedDemo: () => apiFetch('/api/admin/seed-demo', { method: 'POST', auth: true }),

  getResources: (params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/resources${toSearchParams(params)}`)
  },
  getResourceStats: () => apiFetch('/api/resources/stats'),
  createResource: (payload: Record<string, unknown>) => apiFetch('/api/resources', { method: 'POST', body: payload }),
  updateResource: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/resources/${id}`, { method: 'PUT', body: payload }),
  deleteResource: (id: string) => apiFetch(`/api/resources/${id}`, { method: 'DELETE' }),
  allocateResource: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/resources/${id}/allocate`, { method: 'POST', body: payload }),
  deallocateResource: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/resources/${id}/deallocate`, { method: 'POST', body: payload }),
  matchResources: (requestId: string) => apiFetch(`/api/resources/match/${requestId}`),

  getZones: (params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/zones${toSearchParams(params)}`)
  },
  getZoneHeatmap: () => apiFetch('/api/zones/heatmap'),
  getZone: (id: string) => apiFetch(`/api/zones/${id}`),
  createZone: (payload: Record<string, unknown>) => apiFetch('/api/zones', { method: 'POST', body: payload }),
  updateZone: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/zones/${id}`, { method: 'PUT', body: payload }),
  deleteZone: (id: string) => apiFetch(`/api/zones/${id}`, { method: 'DELETE' }),

  getChatMessages: (requestId: string, params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/chat/${requestId}${toSearchParams(params)}`)
  },
  sendChatMessage: (requestId: string, text: string) => apiFetch(`/api/chat/${requestId}`, { method: 'POST', body: { text } }),
  deleteChatMessage: (requestId: string, messageId: string) => apiFetch(`/api/chat/${requestId}/${messageId}`, { method: 'DELETE' }),

  getFeedback: (requestId: string) => apiFetch(`/api/feedback/request/${requestId}`),
  submitFeedback: (requestId: string, payload: Record<string, unknown>) => apiFetch(`/api/feedback/request/${requestId}`, { method: 'POST', body: payload }),
  getFeedbackStats: () => apiFetch('/api/feedback/stats'),

  getSchedules: (params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/schedules${toSearchParams(params)}`)
  },
  createSchedule: (payload: Record<string, unknown>) => apiFetch('/api/schedules', { method: 'POST', body: payload }),
  updateSchedule: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/schedules/${id}`, { method: 'PUT', body: payload }),
  deleteSchedule: (id: string) => apiFetch(`/api/schedules/${id}`, { method: 'DELETE' }),

  getIncidents: (params: Record<string, string | number | boolean | undefined | null> = {}) => {
    return apiFetch(`/api/incidents${toSearchParams(params)}`)
  },
  getIncident: (id: string) => apiFetch(`/api/incidents/${id}`),
  createIncident: (payload: Record<string, unknown>) => apiFetch('/api/incidents', { method: 'POST', body: payload }),
  updateIncident: (id: string, payload: Record<string, unknown>) => apiFetch(`/api/incidents/${id}`, { method: 'PUT', body: payload }),
  deleteIncident: (id: string) => apiFetch(`/api/incidents/${id}`, { method: 'DELETE' }),

  exportRequestsCSV: () => exportCSV('/api/bulk/requests/export', 'requests-export.csv'),
  exportResourcesCSV: () => exportCSV('/api/bulk/resources/export', 'resources-export.csv'),
  importRequests: (rows: Record<string, unknown>[]) => apiFetch('/api/bulk/requests/import', { method: 'POST', body: { rows }, timeout: 120000 }),
  importResources: (rows: Record<string, unknown>[]) => apiFetch('/api/bulk/resources/import', { method: 'POST', body: { rows }, timeout: 120000 }),

  getEscalated: () => apiFetch('/api/escalation'),
  escalateRequest: (requestId: string, reason: string) => apiFetch(`/api/escalation/${requestId}`, { method: 'POST', body: { reason } }),
  deescalateRequest: (requestId: string) => apiFetch(`/api/escalation/${requestId}`, { method: 'DELETE' }),

  broadcastSOS: (payload: Record<string, unknown>) => apiFetch('/api/sos/broadcast', { method: 'POST', body: payload }),
  getSosAlerts: (params: Record<string, string | number | boolean | undefined | null> = {}) => apiFetch(`/api/sos${toSearchParams(params)}`),
  acknowledgeSos: (id: string) => apiFetch(`/api/sos/${id}/acknowledge`, { method: 'PUT' }),
  resolveSos: (id: string) => apiFetch(`/api/sos/${id}/resolve`, { method: 'PUT' }),
  checkGeofencing: (lat: number, lng: number, radiusKm: number) => apiFetch(`/api/geofencing/check?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`),

  getPublicOverview: () => apiFetch('/api/public/overview', { auth: false }),
  getWeatherCurrent: (lat: number, lng: number) => apiFetch(`/api/weather/current?lat=${lat}&lng=${lng}`, { auth: false }),
}
