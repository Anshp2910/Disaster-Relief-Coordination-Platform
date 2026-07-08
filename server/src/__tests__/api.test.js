import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

describe('API Routes', () => {
  let app

  beforeAll(() => {
    app = createApp()
  })

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('GET /api/version returns version', async () => {
    const res = await request(app).get('/api/version')
    expect(res.status).toBe(200)
    expect(res.body.version).toBeDefined()
  })

  it('POST /api/auth/register validates input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid' })
      .set('Content-Type', 'application/json')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('POST /api/auth/login validates input', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
      .set('Content-Type', 'application/json')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('GET /api/unknown returns 404', async () => {
    const res = await request(app).get('/api/unknown')
    expect(res.status).toBe(404)
  })

  it('POST /api/auth/forgot-password validates email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' })
      .set('Content-Type', 'application/json')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/valid email/i)
  })

  it('POST /api/auth/reset-password validates required fields', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({})
      .set('Content-Type', 'application/json')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })
})
