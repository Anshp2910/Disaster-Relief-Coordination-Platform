import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import { connectDB } from './config/db.js'
import { Request } from './models/Request.js'

async function check() {
  await connectDB()
  const cats = await Request.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  console.log('Category distribution:')
  cats.forEach((c) => console.log('  ' + c._id + ': ' + c.count))
  const statuses = await Request.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  console.log('\nStatus distribution:')
  statuses.forEach((s) => console.log('  ' + s._id + ': ' + s.count))
  const total = await Request.countDocuments()
  console.log('\nTotal requests: ' + total)
  const modelCats = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Equipment', 'Other']
  const seeded = cats.map((c) => c._id)
  const missing = modelCats.filter((c) => !seeded.includes(c))
  if (missing.length > 0) console.log('\nMISSING categories:', missing.join(', '))
  else console.log('\nAll 15 categories covered!')
  await mongoose.connection.close()
}

check()
