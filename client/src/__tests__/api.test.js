import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clientApi } from '../api/client'

const BASE = 'http://localhost:5001'

describe('clientApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('auth endpoints', () => {
    it('login makes POST to /api/auth/login without auth header', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'abc', user: { id: 1 } }),
      })
      const result = await clientApi.login({ email: 'test@test.com', password: 'secret' })
      expect(result).toEqual({ token: 'abc', user: { id: 1 } })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'secret' }),
        })
      )
    })

    it('login includes Content-Type header', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await clientApi.login({ email: 'a', password: 'b' })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/login`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
    })

    it('login does not include auth header', async () => {
      localStorage.setItem('token', 'should-not-be-sent')
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await clientApi.login({ email: 'a', password: 'b' })
      const headers = fetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBeUndefined()
    })

    it('forgotPassword makes POST to /api/auth/forgot-password without auth', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      const result = await clientApi.forgotPassword('test@test.com')
      expect(result).toEqual({ ok: true })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/forgot-password`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'test@test.com' }) })
      )
    })

    it('resetPassword makes POST to /api/auth/reset-password without auth', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      const result = await clientApi.resetPassword('token123', 'NewPass123!')
      expect(result).toEqual({ ok: true })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/reset-password`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'token123', password: 'NewPass123!' }) })
      )
    })

    it('refreshToken makes POST to /api/auth/refresh without auth', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ token: 'new-token' }) })
      const result = await clientApi.refreshToken('old-token')
      expect(result).toEqual({ token: 'new-token' })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/refresh`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ token: 'old-token' }) })
      )
    })

    it('me includes auth token from localStorage', async () => {
      localStorage.setItem('token', 'my-token')
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Test' }),
      })
      await clientApi.me()
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      )
    })
  })

  describe('requests endpoints', () => {
    it('getRequests passes query params in URL', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })
      await clientApi.getRequests({ status: 'open', page: '1' })
      const url = fetch.mock.calls[0][0]
      expect(url).toContain('/api/requests?')
      expect(url).toContain('status=open')
      expect(url).toContain('page=1')
    })

    it('getRequest fetches by id', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 42 }),
      })
      const result = await clientApi.getRequest(42)
      expect(result.id).toBe(42)
      expect(fetch).toHaveBeenCalledWith(`${BASE}/api/requests/42`, expect.any(Object))
    })

    it('createRequest sends POST with body', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })
      await clientApi.createRequest({ title: 'Need help' })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/requests`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Need help' }),
        })
      )
    })

    it('deleteRequest sends DELETE', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await clientApi.deleteRequest(5)
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/requests/5`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('error handling', () => {
    it('throws error message from response body', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      })
      await expect(clientApi.me()).rejects.toThrow('Bad request')
    })

    it('throws generic message when no error field in body', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })
      await expect(clientApi.me()).rejects.toThrow('Request failed with status 500')
    })

    it('handles network failure with friendly message', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))
      await expect(clientApi.me()).rejects.toThrow(
        'Unable to connect to the server. Please ensure the backend is running and try again.'
      )
    })

    it('handles abort error with timeout message', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      fetch.mockRejectedValue(abortError)
      await expect(clientApi.me()).rejects.toThrow(
        'Request timed out. Please check your connection and try again.'
      )
    })

    it('re-throws unknown errors', async () => {
      const err = new Error('Some unknown error')
      fetch.mockRejectedValue(err)
      await expect(clientApi.me()).rejects.toThrow('Some unknown error')
    })
  })

  describe('401 handling', () => {
    it('clears token on 401 for authenticated requests', async () => {
      localStorage.setItem('token', 'expired-token')
      localStorage.setItem('user', 'testuser')
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })
      await expect(clientApi.me()).rejects.toThrow()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('resources endpoints', () => {
    it('getResources builds query string', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })
      await clientApi.getResources({ type: 'food', status: 'available' })
      const url = fetch.mock.calls[0][0]
      expect(url).toContain('/api/resources?')
      expect(url).toContain('type=food')
      expect(url).toContain('status=available')
    })

    it('createResource sends POST', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })
      await clientApi.createResource({ name: 'Water', quantity: 100 })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/resources`,
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('incidents endpoints', () => {
    it('getIncidents builds query string', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })
      await clientApi.getIncidents({ severity: 'high' })
      const url = fetch.mock.calls[0][0]
      expect(url).toContain('/api/incidents?')
      expect(url).toContain('severity=high')
    })
  })

  describe('SOS endpoints', () => {
    it('broadcastSOS sends POST', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
      await clientApi.broadcastSOS({ message: 'Help!', lat: 10, lng: 20 })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/sos/broadcast`,
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('file endpoints', () => {
    it('deleteFile sends DELETE', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      })
      const result = await clientApi.deleteFile('req123', 'file456')
      expect(result).toEqual({ files: [] })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/requests/req123/files/file456`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
