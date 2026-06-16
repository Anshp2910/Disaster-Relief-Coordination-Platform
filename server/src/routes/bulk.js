import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { Request } from '../models/Request.js'
import { Resource } from '../models/Resource.js'
import { Zone } from '../models/Zone.js'

export const bulkRouter = express.Router()

bulkRouter.get('/requests/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const items = await Request.find({}).sort({ createdAt: -1 }).lean()
    const headers = ['title', 'description', 'category', 'priority', 'status', 'locationName', 'lat', 'lng', 'createdAt']
    const csv = [headers.join(',')]
    for (const r of items) {
      csv.push(headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    }
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="requests.csv"')
    return res.send(csv.join('\n'))
  } catch (err) {
    console.error('[bulk] export requests error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

bulkRouter.get('/resources/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const items = await Resource.find({}).sort({ createdAt: -1 }).lean()
    const headers = ['name', 'category', 'quantity', 'unit', 'status', 'locationName', 'lat', 'lng', 'createdAt']
    const csv = [headers.join(',')]
    for (const r of items) {
      csv.push(headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    }
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="resources.csv"')
    return res.send(csv.join('\n'))
  } catch (err) {
    console.error('[bulk] export resources error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

bulkRouter.post('/requests/import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows to import' })
    }

    const validCategories = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
    const validStatuses = ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']
    const validPriorities = ['Critical', 'High', 'Medium', 'Low']

    const imported = []
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowErrors = []
      if (!row.title || !row.title.trim()) rowErrors.push('Title is required')
      if (!row.category || !validCategories.includes(row.category)) rowErrors.push(`Invalid category: ${row.category}`)
      if (row.status && !validStatuses.includes(row.status)) rowErrors.push(`Invalid status: ${row.status}`)
      if (row.priority && !validPriorities.includes(row.priority)) rowErrors.push(`Invalid priority: ${row.priority}`)
      
      let lat = row.lat ? Number(row.lat) : undefined
      let lng = row.lng ? Number(row.lng) : undefined
      if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) rowErrors.push('Invalid latitude')
      if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) rowErrors.push('Invalid longitude')

      if (rowErrors.length > 0) {
        errors.push({ row: i + 1, errors: rowErrors })
        continue
      }

      try {
        const locationName = row.locationName || row.location || row.city || row.address || row.place || ''
        if (lat === undefined || lng === undefined) {
          lat = 0
          lng = 0
        }
        const doc = await Request.create({
          title: row.title.trim(),
          description: row.description || row.desc || '',
          category: row.category,
          priority: row.priority || 'Medium',
          status: row.status || 'Open',
          locationName,
          lat,
          lng,
          location: { type: 'Point', coordinates: [lng, lat] },
          createdBy: req.user._id,
          auditLog: [{ action: 'created', by: req.user._id }],
        })
        imported.push(doc._id)
      } catch (rowErr) {
        errors.push({ row: i + 1, errors: [rowErr.message] })
      }
    }

    return res.status(201).json({ imported: imported.length, errors })
  } catch (err) {
    console.error('[bulk] import requests error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

bulkRouter.post('/resources/import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows to import' })
    }

    const validCategories = ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
    const validStatuses = ['Available', 'Low', 'Depleted', 'Reserved']

    const imported = []
    const errors = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowErrors = []
      if (!row.name || !row.name.trim()) rowErrors.push('Name is required')
      if (!row.category || !validCategories.includes(row.category)) rowErrors.push(`Invalid category: ${row.category}`)
      if (row.status && !validStatuses.includes(row.status)) rowErrors.push(`Invalid status: ${row.status}`)
      
      const quantity = row.quantity ? Number(row.quantity) : 0
      if (isNaN(quantity) || quantity < 0) rowErrors.push('Invalid quantity (must be non-negative)')
      
      let lat = row.lat ? Number(row.lat) : undefined
      let lng = row.lng ? Number(row.lng) : undefined
      if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) rowErrors.push('Invalid latitude')
      if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) rowErrors.push('Invalid longitude')

      if (rowErrors.length > 0) {
        errors.push({ row: i + 1, errors: rowErrors })
        continue
      }

      try {
        const locationName = row.locationName || row.location || row.city || row.address || row.place || ''
        const doc = await Resource.create({
          name: row.name.trim(),
          category: row.category,
          quantity,
          unit: row.unit || 'units',
          status: row.status || 'Available',
          locationName,
          lat,
          lng,
          location: (lat !== undefined && lng !== undefined) ? { type: 'Point', coordinates: [lng, lat] } : undefined,
        })
        imported.push(doc._id)
      } catch (rowErr) {
        errors.push({ row: i + 1, errors: [rowErr.message] })
      }
    }

    return res.status(201).json({ imported: imported.length, errors })
  } catch (err) {
    console.error('[bulk] import resources error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})
