const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function getToken() {
  return localStorage.getItem('token')
}

async function apiFetch(path, { method = 'GET', body, auth = true, formData = false, timeout = 15000 } = {}) {
  const headers = {}
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
      body: formData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timer)

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error || `Request failed with status ${res.status}`
      throw new Error(msg)
    }
    return data
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.')
    }
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error('Unable to connect to the server. Please ensure the backend is running and try again.')
    }
    throw err
  }
}

export const clientApi = {
  register: (payload) => apiFetch('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiFetch('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiFetch('/api/auth/me'),
  updateProfile: (payload) => apiFetch('/api/auth/profile', { method: 'PUT', body: payload }),

  getRequests: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/requests${qs ? '?' + qs : ''}`)
  },
  getRequest: (id) => apiFetch(`/api/requests/${id}`),
  createRequest: (payload) => apiFetch('/api/requests', { method: 'POST', body: payload }),
  updateRequest: (id, payload) => apiFetch(`/api/requests/${id}`, { method: 'PUT', body: payload }),
  deleteRequest: (id) => apiFetch(`/api/requests/${id}`, { method: 'DELETE' }),
  claimRequest: (id) => apiFetch(`/api/requests/${id}/claim`, { method: 'POST' }),
  unclaimRequest: (id) => apiFetch(`/api/requests/${id}/unclaim`, { method: 'POST' }),
  getComments: (id) => apiFetch(`/api/requests/${id}`).then((d) => d.item?.comments || []),
  addComment: (id, text) => apiFetch(`/api/requests/${id}/comments`, { method: 'POST', body: { text } }),
  deleteComment: (id, commentId) => apiFetch(`/api/requests/${id}/comments/${commentId}`, { method: 'DELETE' }),
  uploadFiles: (id, files) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    return apiFetch(`/api/requests/${id}/files`, { method: 'POST', body: fd, formData: true })
  },

  adminStats: () => apiFetch('/api/admin/stats'),
  adminUsers: () => apiFetch('/api/admin/users'),
  adminUpdateUserRole: (id, role) => apiFetch(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  adminDeleteUser: (id) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminDeleteRequest: (id) => apiFetch(`/api/admin/requests/${id}`, { method: 'DELETE' }),
  adminExportRequests: (format = 'json') => apiFetch(`/api/admin/export/requests?format=${format}`),

  getResources: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/resources${qs ? '?' + qs : ''}`)
  },
  getResourceStats: () => apiFetch('/api/resources/stats'),
  createResource: (payload) => apiFetch('/api/resources', { method: 'POST', body: payload }),
  updateResource: (id, payload) => apiFetch(`/api/resources/${id}`, { method: 'PUT', body: payload }),
  deleteResource: (id) => apiFetch(`/api/resources/${id}`, { method: 'DELETE' }),
  allocateResource: (id, payload) => apiFetch(`/api/resources/${id}/allocate`, { method: 'POST', body: payload }),
  deallocateResource: (id, payload) => apiFetch(`/api/resources/${id}/deallocate`, { method: 'POST', body: payload }),
  matchResources: (requestId) => apiFetch(`/api/resources/match/${requestId}`),

  getZones: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/zones${qs ? '?' + qs : ''}`)
  },
  getZoneHeatmap: () => apiFetch('/api/zones/heatmap'),
  getZone: (id) => apiFetch(`/api/zones/${id}`),
  createZone: (payload) => apiFetch('/api/zones', { method: 'POST', body: payload }),
  updateZone: (id, payload) => apiFetch(`/api/zones/${id}`, { method: 'PUT', body: payload }),
  deleteZone: (id) => apiFetch(`/api/zones/${id}`, { method: 'DELETE' }),

  getChatMessages: (requestId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/chat/${requestId}${qs ? '?' + qs : ''}`)
  },
  sendChatMessage: (requestId, text) => apiFetch(`/api/chat/${requestId}`, { method: 'POST', body: { text } }),
  deleteChatMessage: (requestId, messageId) => apiFetch(`/api/chat/${requestId}/${messageId}`, { method: 'DELETE' }),

  getFeedback: (requestId) => apiFetch(`/api/feedback/request/${requestId}`),
  submitFeedback: (requestId, payload) => apiFetch(`/api/feedback/request/${requestId}`, { method: 'POST', body: payload }),
  getFeedbackStats: () => apiFetch('/api/feedback/stats'),

  getSchedules: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/schedules${qs ? '?' + qs : ''}`)
  },
  createSchedule: (payload) => apiFetch('/api/schedules', { method: 'POST', body: payload }),
  updateSchedule: (id, payload) => apiFetch(`/api/schedules/${id}`, { method: 'PUT', body: payload }),
  deleteSchedule: (id) => apiFetch(`/api/schedules/${id}`, { method: 'DELETE' }),

  getIncidents: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/incidents${qs ? '?' + qs : ''}`)
  },
  getIncident: (id) => apiFetch(`/api/incidents/${id}`),
  createIncident: (payload) => apiFetch('/api/incidents', { method: 'POST', body: payload }),
  updateIncident: (id, payload) => apiFetch(`/api/incidents/${id}`, { method: 'PUT', body: payload }),
  deleteIncident: (id) => apiFetch(`/api/incidents/${id}`, { method: 'DELETE' }),

  exportRequestsCSV: () => `${API_BASE}/api/bulk/requests/export?token=${getToken()}`,
  exportResourcesCSV: () => `${API_BASE}/api/bulk/resources/export?token=${getToken()}`,
  importRequests: (rows) => apiFetch('/api/bulk/requests/import', { method: 'POST', body: { rows } }),
  importResources: (rows) => apiFetch('/api/bulk/resources/import', { method: 'POST', body: { rows } }),

  getEscalated: () => apiFetch('/api/escalation'),
  escalateRequest: (requestId, reason) => apiFetch(`/api/escalation/${requestId}`, { method: 'POST', body: { reason } }),
  deescalateRequest: (requestId) => apiFetch(`/api/escalation/${requestId}`, { method: 'DELETE' }),

  broadcastSOS: (payload) => apiFetch('/api/sos/broadcast', { method: 'POST', body: payload }),
  checkGeofencing: (lat, lng, radiusKm) => apiFetch(`/api/geofencing/check?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`),
}
