import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createApp } from '../app.js'

describe('API Routes', () => {
  let app

  beforeAll(() => {
    app = createApp()
  })

  it('GET /health returns ok', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('GET /api/version returns version', async () => {
    const res = await app.request('/api/version')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.version).toBeDefined()
  })

  it('GET /api/public/overview returns overview', async () => {
    const res = await app.request('/api/public/overview')
    expect(res.status).toBeDefined()
  })

  it('POST /api/auth/register validates input', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('POST /api/auth/login validates input', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('GET /api/unknown returns 404', async () => {
    const res = await app.request('/api/unknown')
    expect(res.status).toBe(404)
  })
})
