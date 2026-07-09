import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import { getJwtSecret } from '../src/config/env.js'
import jwt from 'jsonwebtoken'

let app
let adminToken
let userToken
let mongod

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long!!'
  process.env.NODE_ENV = 'test'

  // Start in-memory MongoDB (first run downloads the binary, so timeout is generous)
  mongod = await MongoMemoryServer.create()
  const mongoUri = mongod.getUri()

  await mongoose.connect(mongoUri)

  const { User } = await import('../src/models/User.js')

  const admin = new User({
    email: 'admin@test.com',
    displayName: 'Test Admin',
    role: 'admin',
  })
  await admin.setPassword('TestPass@123')
  await admin.save()

  const user = new User({
    email: 'user@test.com',
    displayName: 'Test User',
    role: 'volunteer',
  })
  await user.setPassword('TestPass@123')
  await user.save()

  adminToken = jwt.sign({ sub: admin._id.toString(), role: 'admin' }, getJwtSecret(), { expiresIn: '1h' })
  userToken = jwt.sign({ sub: user._id.toString(), role: 'volunteer' }, getJwtSecret(), { expiresIn: '1h' })

  app = createApp()
}, 120000)  // 2 min timeout for first-time binary download

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections
    for (const key in collections) {
      await collections[key].deleteMany({})
    }
    await mongoose.disconnect()
  }
  if (mongod) {
    await mongod.stop()
  }
})

describe('Health & Version', () => {
  it('GET /health returns ok', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('Request API', () => {
  it('rejects unauthenticated requests', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app).get('/api/requests')
    expect(res.status).toBe(401)
  })

  it('lists requests for authenticated user', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.meta).toHaveProperty('total')
  })

  it('creates a request', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'Test Description',
        locationName: 'Test Location',
        lat: 28.61,
        lng: 77.23,
        category: 'Food',
        priority: 'High',
        peopleCount: 5,
      })
    expect(res.status).toBe(201)
    expect(res.body.data.item).toHaveProperty('_id')
    expect(res.body.data.item.title).toBe('Test Request')
  })

  it('rejects missing required fields', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Incomplete' })
    expect(res.status).toBe(400)
  })
})

describe('Auth API', () => {
  it('rejects login with wrong password', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpass' })
    expect(res.status).toBe(401)
  })

  it('registers a new user', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@test.com',
        password: 'StrongPass@123',
        role: 'volunteer',
        displayName: 'New User',
      })
    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data).toHaveProperty('user')
  })
})

describe('Admin API', () => {
  it('rejects non-admin users', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('allows admin access', async () => {
    const { default: request } = await import('supertest')
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('totalUsers')
    expect(res.body.data).toHaveProperty('totalRequests')
  })
})
