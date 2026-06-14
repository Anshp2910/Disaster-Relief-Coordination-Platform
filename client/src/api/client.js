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
}
