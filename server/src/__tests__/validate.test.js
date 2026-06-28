import { describe, it, expect, vi } from 'vitest'
import { validate, validateQuery, querySchemas } from '../middleware/validate.js'

function makeRes() {
  const res = { statusCode: null, body: null, status: vi.fn().mockReturnThis(), json: vi.fn(function (data) { res.body = data; return res }) }
  return res
}

function callMiddleware(schemaName, body) {
  const req = { body }
  const res = makeRes()
  const next = vi.fn()
  validate(schemaName)(req, res, next)
  return { req, res, next }
}

function callQueryMiddleware(schema, query) {
  const req = { query }
  const res = makeRes()
  const next = vi.fn()
  validateQuery(schema)(req, res, next)
  return { req, res, next }
}

describe('validate - register', () => {
  it('passes valid registration', () => {
    const { next, res } = callMiddleware('register', {
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      role: 'volunteer',
      displayName: 'Alice',
    })
    expect(next).toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('rejects invalid email', () => {
    const { res, next } = callMiddleware('register', {
      email: 'not-an-email',
      password: 'Str0ng!Pass',
      role: 'volunteer',
      displayName: 'Alice',
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects short password', () => {
    const { res, next } = callMiddleware('register', {
      email: 'a@b.com',
      password: 'Ab1!',
      role: 'volunteer',
      displayName: 'Alice',
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects password without uppercase', () => {
    const { res, next } = callMiddleware('register', {
      email: 'a@b.com',
      password: 'lowercase1!',
      role: 'volunteer',
      displayName: 'Alice',
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects password without special char', () => {
    const { res, next } = callMiddleware('register', {
      email: 'a@b.com',
      password: 'NoSpecial1A',
      role: 'volunteer',
      displayName: 'Alice',
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects invalid role', () => {
    const { res, next } = callMiddleware('register', {
      email: 'a@b.com',
      password: 'Str0ng!Pass',
      role: 'admin',
      displayName: 'Alice',
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects missing displayName', () => {
    const { res, next } = callMiddleware('register', {
      email: 'a@b.com',
      password: 'Str0ng!Pass',
      role: 'volunteer',
    })
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('lowercases and trims email', () => {
    const { req } = callMiddleware('register', {
      email: '  TEST@EXAMPLE.COM  ',
      password: 'Str0ng!Pass',
      role: 'volunteer',
      displayName: 'Alice',
    })
    expect(req.body.email).toBe('test@example.com')
  })
})

describe('validate - login', () => {
  it('passes valid login', () => {
    const { next } = callMiddleware('login', {
      email: 'test@example.com',
      password: 'anypassword',
    })
    expect(next).toHaveBeenCalled()
  })

  it('rejects missing password', () => {
    const { res } = callMiddleware('login', { email: 'a@b.com' })
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('validate - createRequest', () => {
  it('passes valid request', () => {
    const { next } = callMiddleware('createRequest', {
      title: 'Help needed',
      description: 'Flood in area',
      locationName: 'Downtown',
      lat: 28.6,
      lng: 77.2,
    })
    expect(next).toHaveBeenCalled()
  })

  it('rejects missing title', () => {
    const { res } = callMiddleware('createRequest', {
      description: 'Flood',
      locationName: 'Area',
      lat: 28.6,
      lng: 77.2,
    })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects out-of-range latitude', () => {
    const { res } = callMiddleware('createRequest', {
      title: 'Test',
      description: 'Test',
      locationName: 'Area',
      lat: 100,
      lng: 77.2,
    })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects out-of-range longitude', () => {
    const { res } = callMiddleware('createRequest', {
      title: 'Test',
      description: 'Test',
      locationName: 'Area',
      lat: 28.6,
      lng: 200,
    })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('strips unknown fields', () => {
    const { req } = callMiddleware('createRequest', {
      title: 'Help',
      description: 'Desc',
      locationName: 'Loc',
      lat: 0,
      lng: 0,
      hackerField: 'drop table',
    })
    expect(req.body.hackerField).toBeUndefined()
  })
})

describe('validate - createResource', () => {
  it('passes valid resource', () => {
    const { next } = callMiddleware('createResource', {
      name: 'Water Bottles',
      category: 'Water',
      quantity: 100,
      unit: 'liters',
      locationName: 'Warehouse A',
    })
    expect(next).toHaveBeenCalled()
  })

  it('rejects missing name', () => {
    const { res } = callMiddleware('createResource', {
      category: 'Water',
      quantity: 100,
      unit: 'liters',
      locationName: 'Warehouse',
    })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects invalid category', () => {
    const { res } = callMiddleware('createResource', {
      name: 'Item',
      category: 'InvalidCat',
      quantity: 10,
      unit: 'pcs',
      locationName: 'Loc',
    })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects negative quantity', () => {
    const { res } = callMiddleware('createResource', {
      name: 'Item',
      category: 'Food',
      quantity: -5,
      unit: 'kg',
      locationName: 'Loc',
    })
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('validate - unknown schema', () => {
  it('calls next for unknown schema name', () => {
    const { next } = callMiddleware('nonexistent', { anything: true })
    expect(next).toHaveBeenCalled()
  })
})

describe('validateQuery - requestsList', () => {
  it('passes valid query', () => {
    const { next } = callQueryMiddleware(querySchemas.requestsList, { page: 1, limit: 20 })
    expect(next).toHaveBeenCalled()
  })

  it('applies defaults', () => {
    const { req } = callQueryMiddleware(querySchemas.requestsList, {})
    expect(req.query.page).toBe(1)
    expect(req.query.limit).toBe(20)
  })

  it('strips unknown query params', () => {
    const { req } = callQueryMiddleware(querySchemas.requestsList, { page: 1, hack: 'yes' })
    expect(req.query.hack).toBeUndefined()
  })

  it('rejects invalid sort field', () => {
    const { res } = callQueryMiddleware(querySchemas.requestsList, { sort: 'invalid' })
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
