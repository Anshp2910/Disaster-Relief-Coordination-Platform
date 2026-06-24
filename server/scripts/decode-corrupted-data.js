/**
 * Migration script: Decode HTML entities in existing database records
 * that were corrupted by the old sanitizeBody middleware.
 *
 * Run: node scripts/decode-corrupted-data.js
 *
 * This reverses the old sanitizeBody encoding:
 *   &lt; -> <
 *   &gt; -> >
 *   &quot; -> "
 *   &#x27; -> '
 *   &amp; -> &
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const MONGO_URI = process.env.MONGODB_URI

if (!MONGO_URI) {
  console.error('MONGODB_URI not set in .env')
  process.exit(1)
}

function decodeEntities(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

function traverseAndDecode(obj) {
  if (typeof obj === 'string') return decodeEntities(obj)
  if (Array.isArray(obj)) return obj.map(traverseAndDecode)
  if (obj && typeof obj === 'object') {
    const result = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = traverseAndDecode(v)
    }
    return result
  }
  return obj
}

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const collections = ['requests', 'zones', 'resources', 'incidents', 'users', 'schedules', 'feedback', 'sosalerts', 'chatmessages']
  let totalFixed = 0

  for (const name of collections) {
    const coll = mongoose.connection.collection(name)
    const cursor = coll.find()
    let batch = []
    let count = 0

    while (await cursor.hasNext()) {
      const doc = await cursor.next()
      const fixed = traverseAndDecode(doc)

      // Compare JSON strings to detect changes
      if (JSON.stringify(doc) !== JSON.stringify(fixed)) {
        batch.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: fixed },
          },
        })
        count++
      }

      if (batch.length >= 50) {
        await coll.bulkWrite(batch)
        totalFixed += batch.length
        console.log(`  ${name}: fixed ${totalFixed} so far...`)
        batch = []
      }
    }

    if (batch.length > 0) {
      await coll.bulkWrite(batch)
      totalFixed += batch.length
    }

    console.log(`${name}: ${count} documents fixed`)
  }

  console.log(`\nDone! ${totalFixed} total documents fixed.`)
  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
