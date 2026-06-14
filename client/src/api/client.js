const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

function getToken() {
  return localStorage.getItem('token')
}

async function apiFetch(path, { method = 'GET', body, auth = true, formData = false } = {}) {
  const headers = {}
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (!formData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData ? body : body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error || `Request failed with status ${res.status}`
    throw new Error(msg)
  }
  return data
}

export const clientApi = {
  register: (payload) => apiFetch('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiFetch('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiFetch('/api/auth/me', { method: 'GET' }),
  updateProfile: (payload) => apiFetch('/api/auth/profile', { method: 'PUT', body: payload }),

  getRequests: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/requests${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  getRequest: (id) => apiFetch(`/api/requests/${id}`, { method: 'GET' }),
  createRequest: (payload) => apiFetch('/api/requests', { method: 'POST', body: payload }),
  updateRequest: (id, payload) => apiFetch(`/api/requests/${id}`, { method: 'PUT', body: payload }),
  deleteRequest: (id) => apiFetch(`/api/requests/${id}`, { method: 'DELETE' }),

  claimRequest: (id) => apiFetch(`/api/requests/${id}/claim`, { method: 'POST' }),
  unclaimRequest: (id) => apiFetch(`/api/requests/${id}/unclaim`, { method: 'POST' }),

  getComments: (id) => apiFetch(`/api/requests/${id}`, { method: 'GET' }).then((d) => d.item?.comments || []),
  addComment: (id, text) => apiFetch(`/api/requests/${id}/comments`, { method: 'POST', body: { text } }),
  deleteComment: (id, commentId) => apiFetch(`/api/requests/${id}/comments/${commentId}`, { method: 'DELETE' }),

  uploadFiles: (id, files) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    return apiFetch(`/api/requests/${id}/files`, { method: 'POST', body: fd, formData: true })
  },

  adminStats: () => apiFetch('/api/admin/stats', { method: 'GET' }),
  adminUsers: () => apiFetch('/api/admin/users', { method: 'GET' }),
  adminUpdateUserRole: (id, role) => apiFetch(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  adminDeleteUser: (id) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminDeleteRequest: (id) => apiFetch(`/api/admin/requests/${id}`, { method: 'DELETE' }),
  adminExportRequests: (format = 'json') => apiFetch(`/api/admin/export/requests?format=${format}`, { method: 'GET' }),

  getResources: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/resources${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  getResourceStats: () => apiFetch('/api/resources/stats', { method: 'GET' }),
  createResource: (payload) => apiFetch('/api/resources', { method: 'POST', body: payload }),
  updateResource: (id, payload) => apiFetch(`/api/resources/${id}`, { method: 'PUT', body: payload }),
  deleteResource: (id) => apiFetch(`/api/resources/${id}`, { method: 'DELETE' }),
  allocateResource: (id, payload) => apiFetch(`/api/resources/${id}/allocate`, { method: 'POST', body: payload }),
  deallocateResource: (id, payload) => apiFetch(`/api/resources/${id}/deallocate`, { method: 'POST', body: payload }),
  matchResources: (requestId) => apiFetch(`/api/resources/match/${requestId}`, { method: 'GET' }),

  getZones: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/zones${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  getZoneHeatmap: () => apiFetch('/api/zones/heatmap', { method: 'GET' }),
  getZone: (id) => apiFetch(`/api/zones/${id}`, { method: 'GET' }),
  createZone: (payload) => apiFetch('/api/zones', { method: 'POST', body: payload }),
  updateZone: (id, payload) => apiFetch(`/api/zones/${id}`, { method: 'PUT', body: payload }),
  deleteZone: (id) => apiFetch(`/api/zones/${id}`, { method: 'DELETE' }),

  // Chat
  getChatMessages: (requestId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/chat/${requestId}${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  sendChatMessage: (requestId, text) => apiFetch(`/api/chat/${requestId}`, { method: 'POST', body: { text } }),
  deleteChatMessage: (requestId, messageId) => apiFetch(`/api/chat/${requestId}/${messageId}`, { method: 'DELETE' }),

  // Feedback
  getFeedback: (requestId) => apiFetch(`/api/feedback/request/${requestId}`, { method: 'GET' }),
  submitFeedback: (requestId, payload) => apiFetch(`/api/feedback/request/${requestId}`, { method: 'POST', body: payload }),
  getFeedbackStats: () => apiFetch('/api/feedback/stats', { method: 'GET' }),

  // Schedules
  getSchedules: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/schedules${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  createSchedule: (payload) => apiFetch('/api/schedules', { method: 'POST', body: payload }),
  updateSchedule: (id, payload) => apiFetch(`/api/schedules/${id}`, { method: 'PUT', body: payload }),
  deleteSchedule: (id) => apiFetch(`/api/schedules/${id}`, { method: 'DELETE' }),

  // Incidents
  getIncidents: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch(`/api/incidents${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  getIncident: (id) => apiFetch(`/api/incidents/${id}`, { method: 'GET' }),
  createIncident: (payload) => apiFetch('/api/incidents', { method: 'POST', body: payload }),
  updateIncident: (id, payload) => apiFetch(`/api/incidents/${id}`, { method: 'PUT', body: payload }),
  deleteIncident: (id) => apiFetch(`/api/incidents/${id}`, { method: 'DELETE' }),

  // Bulk Import/Export
  exportRequestsCSV: () => `${API_BASE}/api/bulk/requests/export?token=${getToken()}`,
  exportResourcesCSV: () => `${API_BASE}/api/bulk/resources/export?token=${getToken()}`,
  importRequests: (rows) => apiFetch('/api/bulk/requests/import', { method: 'POST', body: { rows } }),
  importResources: (rows) => apiFetch('/api/bulk/resources/import', { method: 'POST', body: { rows } }),

  // Escalation
  getEscalated: () => apiFetch('/api/escalation', { method: 'GET' }),
  escalateRequest: (requestId, reason) => apiFetch(`/api/escalation/${requestId}`, { method: 'POST', body: { reason } }),
  deescalateRequest: (requestId) => apiFetch(`/api/escalation/${requestId}`, { method: 'DELETE' }),

  // SOS
  broadcastSOS: (payload) => apiFetch('/api/sos/broadcast', { method: 'POST', body: payload }),

  // Geofencing
  checkGeofencing: (lat, lng, radiusKm) => apiFetch(`/api/geofencing/check?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`, { method: 'GET' }),

  // Profile extended
  updateProfileExtended: (payload) => apiFetch('/api/auth/profile', { method: 'PUT', body: payload }),
}
