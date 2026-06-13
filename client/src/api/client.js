const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function getToken() {
  return localStorage.getItem('token')
}

async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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
  getRequests: () => apiFetch('/api/requests', { method: 'GET' }),
  getRequest: (id) => apiFetch(`/api/requests/${id}`, { method: 'GET' }),
  createRequest: (payload) => apiFetch('/api/requests', { method: 'POST', body: payload }),
  updateRequest: (id, payload) => apiFetch(`/api/requests/${id}`, { method: 'PUT', body: payload }),
  deleteRequest: (id) => apiFetch(`/api/requests/${id}`, { method: 'DELETE' }),
  adminStats: () => apiFetch('/api/admin/stats', { method: 'GET' }),
  adminUsers: () => apiFetch('/api/admin/users', { method: 'GET' }),
  adminUpdateUserRole: (id, role) => apiFetch(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  adminDeleteUser: (id) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminDeleteRequest: (id) => apiFetch(`/api/admin/requests/${id}`, { method: 'DELETE' }),
}
