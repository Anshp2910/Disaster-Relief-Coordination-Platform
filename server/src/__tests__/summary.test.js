import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => { req.user = { _id: '000000000000000000000001', role: 'admin' }; next() },
  requireAdmin: (req, res, next) => next(),
}))

vi.mock('../models/Request.js', () => {
  const mockRequest = {
    find: vi.fn().mockReturnThis(),
    findById: vi.fn().mockReturnThis(),
    findOneAndUpdate: vi.fn().mockReturnThis(),
    countDocuments: vi.fn().mockResolvedValue(5),
    aggregate: vi.fn(),
    create: vi.fn(),
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
  }
  mockRequest.find.mockReturnValue(mockRequest)
  mockRequest.findById.mockReturnValue(mockRequest)
  mockRequest.countDocuments.mockResolvedValue(5)
  mockRequest.aggregate.mockResolvedValue([{ _id: 'Open', count: 3 }, { _id: 'Resolved', count: 2 }])
  return { Request: mockRequest }
})

vi.mock('../models/User.js', () => ({
  User: {
    countDocuments: vi.fn().mockResolvedValue(10),
  },
}))
vi.mock('../utils/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

describe('Requests Summary Endpoint', () => {
  let app

  beforeAll(() => {
    app = createApp()
  })

  it('GET /api/requests?summary=true returns enriched response with aggregated stats', async () => {
    const res = await request(app)
      .get('/api/requests?summary=true')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(200)
    expect(res.body.items).toBeDefined()
    expect(res.body.total).toBeDefined()
    expect(res.body.page).toBeDefined()
    expect(res.body.pages).toBeDefined()
    expect(res.body.byStatus).toBeDefined()
    expect(res.body.byPriority).toBeDefined()
    expect(res.body.byCategory).toBeDefined()
    expect(res.body.dailyRequests).toBeDefined()
  })

  it('GET /api/requests without summary returns basic paginated response', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(200)
    expect(res.body.items).toBeDefined()
    expect(res.body.total).toBeDefined()
    expect(res.body.byStatus).toBeUndefined()
    expect(res.body.dailyRequests).toBeUndefined()
  })

  it('GET /api/admin/stats returns aggregated platform stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer test-token')

    expect(res.status).toBe(200)
    expect(res.body.totalUsers).toBeDefined()
    expect(res.body.totalRequests).toBeDefined()
    expect(res.body.byStatus).toBeDefined()
    expect(res.body.byPriority).toBeDefined()
    expect(res.body.byCategory).toBeDefined()
  })
})
