import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { User } from './models/User.js'
import { Request } from './models/Request.js'
import { Resource } from './models/Resource.js'
import { Zone } from './models/Zone.js'
import { Incident } from './models/Incident.js'
import { Schedule } from './models/Schedule.js'
import { Feedback } from './models/Feedback.js'
import { ChatMessage } from './models/ChatMessage.js'

const LOCATIONS = [
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Bhubaneswar, Odisha', lat: 20.2961, lng: 85.8245 },
  { name: 'Visakhapatnam, Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { name: 'Thiruvananthapuram, Kerala', lat: 8.5241, lng: 76.9366 },
  { name: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Lucknow, Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Chennai Beach', lat: 13.0067, lng: 80.2785 },
  { name: 'Mumbai Suburbs', lat: 19.2500, lng: 72.8500 },
  { name: 'Kolkata Riverside', lat: 22.5500, lng: 88.3500 },
]

const CATEGORIES = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Other']
const RESOURCE_CATEGORIES = ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other']
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Fulfilled']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const RESOURCE_STATUSES = ['Available', 'Low', 'Depleted', 'Reserved']
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const DISASTER_TYPES = ['Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other']
const SKILLS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']

const REQUEST_TITLES = [
  'Flood relief needed - urgent food and water',
  'Medical supplies required for displaced families',
  'Temporary shelter needed for 50 families',
  'Drinking water shortage - tanker required',
  'Rescue boats needed for stranded villagers',
  'Emergency medical camp setup required',
  'Food packets for 200 affected people',
  'Search and rescue team needed in flooded area',
  'Mosquito nets and medicine for malaria outbreak',
  'Baby food and milk powder urgently needed',
  'School supplies for children in relief camp',
  'Wheelchair and mobility aids needed',
  'Portable toilets for relief camp',
  'Clothes and blankets for cold weather',
  'Generators and fuel for power outage',
  'First aid kits and bandages required',
  'Cooking utensils for community kitchen',
  'Tarpaulins and ropes for temporary shelters',
  'ORS packets and diarrhoea medicine',
  'Petrol and diesel for rescue vehicles',
  'Clean-up crew needed after cyclone',
  'Counselling services for trauma victims',
  'Mobile charging stations for affected areas',
  'Animal feed for livestock in flood zone',
  'Construction materials for rebuilding homes',
  'Water purifiers and chlorine tablets',
  'Ambulance service for critical patients',
  'Blood donation camp setup needed',
  'Vaccination drive for children under 5',
  'Support for elderly and disabled evacuations',
]

const RESOURCE_NAMES = [
  'Rice bags (25kg)', 'Wheat flour (10kg)', 'Cooking oil (5L)', 'Potable water cans (20L)',
  'First aid kits', 'Paracetamol tablets', 'ORS packets', 'Antibiotic course',
  'Tents (4-person)', 'Tarpaulins', 'Blankets', 'Mosquito nets',
  'Life jackets', 'Rescue rope (50m)', 'Flashlights with batteries', 'Portable generators',
  'Chlorine tablets (100pk)', 'Water purifiers', 'Soap bars', 'Sanitary napkins',
  'Baby diapers', 'Baby formula (1kg)', 'Plastic sheets', 'Collapsible water tanks',
  'Stretchers', 'Wheelchairs', 'Oxygen cylinders', 'PPE kits',
  'Walkie-talkies', 'Power banks',
]

const ZONE_NAMES = [
  'Chennai Coastal Flood Zone', 'Mumbai Western Suburbs', 'Kolkata Low-Lying Area',
  'Bhubaneswar Cyclone Corridor', 'Visakhapatnam Port Area', 'Kerala Backwater Region',
  'Delhi Yamuna Floodplain', 'Guwahati Brahmaputra Belt', 'Pune Western Ghats', 'Ahmedabad Drought Area',
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateLatLng(baseLat, baseLng) {
  return {
    lat: baseLat + (Math.random() - 0.5) * 0.02,
    lng: baseLng + (Math.random() - 0.5) * 0.02,
  }
}

export async function seedDemo() {
  const existingCount = await Request.countDocuments()
  if (existingCount > 50) {
    console.log(`[demo] ${existingCount} requests already exist, skipping demo seed`)
    return
  }

  const admin = await User.findOne({ role: 'admin' })
  if (!admin) {
    console.log('[demo] no admin user found, skipping')
    return
  }

  const volunteers = []
  const ngoUsers = []
  for (let i = 0; i < 5; i++) {
    const role = i < 3 ? 'volunteer' : 'ngo'
    const email = `demo${role}${i}@test.com`
    let user = await User.findOne({ email })
    if (!user) {
      user = new User({ email, role, displayName: `Demo ${role} ${i + 1}`, passwordHash: '' })
      await user.setPassword('demo123')
      await user.save()
    }
    if (role === 'volunteer') volunteers.push(user)
    else ngoUsers.push(user)
  }
  const allUsers = [...volunteers, ...ngoUsers]

  console.log('[demo] creating zones...')
  const zoneDocs = []
  for (let i = 0; i < ZONE_NAMES.length; i++) {
    const loc = LOCATIONS[i % LOCATIONS.length]
    const existing = await Zone.findOne({ name: ZONE_NAMES[i] })
    if (existing) { zoneDocs.push(existing); continue }
    const zone = await Zone.create({
      name: ZONE_NAMES[i],
      description: `Disaster zone covering ${loc.name} and surrounding areas`,
      centerLat: loc.lat, centerLng: loc.lng,
      location: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      radiusKm: 15 + Math.floor(Math.random() * 20),
      severity: pick(SEVERITIES),
      status: pick(['Active', 'Monitoring']),
      disasterType: pick(DISASTER_TYPES),
      affectedPopulation: Math.floor(Math.random() * 50000) + 500,
      createdBy: admin._id,
    })
    zoneDocs.push(zone)
  }

  const count = 100
  console.log(`[demo] creating ${count} requests...`)
  for (let i = 0; i < count; i++) {
    const loc = pick(LOCATIONS)
    const offset = generateLatLng(loc.lat, loc.lng)
    const creator = pick(allUsers)
    const status = Math.random() < 0.4 ? 'Open' : Math.random() < 0.6 ? 'In Progress' : Math.random() < 0.8 ? 'Resolved' : 'Fulfilled'
    const claimer = status !== 'Open' ? pick(allUsers) : null

    const request = await Request.create({
      title: REQUEST_TITLES[i % REQUEST_TITLES.length] + (i >= REQUEST_TITLES.length ? ` #${Math.floor(i / REQUEST_TITLES.length) + 1}` : ''),
      description: `Urgent assistance required at ${loc.name}. ${Math.floor(Math.random() * 500) + 50} people affected. Need immediate support for relief operations.`,
      locationName: loc.name,
      lat: offset.lat, lng: offset.lng,
      location: { type: 'Point', coordinates: [offset.lng, offset.lat] },
      status, category: pick(CATEGORIES), priority: pick(PRIORITIES),
      peopleCount: Math.floor(Math.random() * 100) + 1,
      createdBy: creator._id,
      claimedBy: claimer ? claimer._id : null,
      claimedAt: claimer ? new Date() : null,
      auditLog: [{ action: 'created', by: creator._id }],
    })

    if (claimer) {
      request.auditLog.push({ action: 'claimed', by: claimer._id })
      await request.save()
    }
  }

  console.log('[demo] creating resources...')
  for (let i = 0; i < 30; i++) {
    const loc = pick(LOCATIONS)
    const qty = Math.floor(Math.random() * 500) + 10
    const status = qty === 0 ? 'Depleted' : qty <= 20 ? 'Low' : 'Available'
    await Resource.create({
      name: pick(RESOURCE_NAMES),
      category: pick(RESOURCE_CATEGORIES),
      quantity: qty, unit: pick(['kg', 'L', 'units', 'boxes', 'pairs', 'sets']),
      locationName: loc.name, lat: loc.lat, lng: loc.lng,
      location: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      status, updatedBy: admin._id,
    })
  }

  console.log('[demo] creating incidents...')
  for (let i = 0; i < 5; i++) {
    const loc = LOCATIONS[i]
    const incidentZones = [zoneDocs[i], zoneDocs[i + 1 % zoneDocs.length]].filter(Boolean)
    await Incident.create({
      name: `${pick(DISASTER_TYPES)} in ${loc.name}`,
      description: `A ${pick(DISASTER_TYPES).toLowerCase()} has affected the ${loc.name} region. Relief operations underway.`,
      disasterType: pick(DISASTER_TYPES), severity: pick(SEVERITIES),
      status: pick(['Active', 'Monitoring']),
      zones: incidentZones.map((z) => z._id),
      startDate: new Date(), affectedPopulation: Math.floor(Math.random() * 100000) + 1000,
      centerLat: loc.lat, centerLng: loc.lng,
      location: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      createdBy: admin._id,
    })
  }

  console.log('[demo] creating schedules...')
  for (let i = 0; i < 20; i++) {
    const user = pick(allUsers)
    const zone = pick(zoneDocs)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7))
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1)
    await Schedule.create({
      userId: user._id, zoneId: zone._id,
      startDate, endDate,
      shift: pick(['Morning', 'Afternoon', 'Night', 'Full Day']),
      skills: [pick(SKILLS)], status: 'Scheduled',
    })
  }

  const allRequests = await Request.find().lean()
  console.log('[demo] creating chat messages...')
  for (let i = 0; i < 50; i++) {
    const req = pick(allRequests)
    const sender = pick(allUsers)
    await ChatMessage.create({
      requestId: req._id, sender: sender._id,
      text: pick(['On our way with supplies', 'Need more information about location', 'Arriving in 30 minutes', 'Can someone coordinate from the site?', 'Requesting additional support', 'Status update: reached location', 'Need medical team backup', 'Water purifiers delivered']),
    })
  }

  console.log('[demo] creating feedback...')
  const fulfilledReqs = allRequests.filter((r) => r.status === 'Fulfilled')
  for (const req of fulfilledReqs.slice(0, 30)) {
    const requester = await User.findById(req.createdBy).lean()
    if (requester) {
      await Feedback.create({
        requestId: req._id, submittedBy: requester._id,
        rating: Math.floor(Math.random() * 3) + 3,
        comment: pick(['Good response time', 'Helpful team', 'Could be faster', 'Satisfied with the support']),
        deliveryConfirmed: true,
      })
    }
  }

  console.log(`[demo] done: ${count} requests, 30 resources, ${zoneDocs.length} zones, 5 incidents, 20 schedules, 50 messages, feedback`)
}

async function main() {
  try {
    await connectDB()
    const existing = await Request.countDocuments()
    if (existing > 50) {
      console.log(`[demo] ${existing} requests exist, skipping`)
      process.exit(0)
    }
    await seedDemo()
  } catch (err) {
    console.error('[demo] error:', err)
  } finally {
    await mongoose.connection.close()
  }
}

if (process.argv[1] && (process.argv[1].endsWith('seed-demo.js') || process.argv[1].endsWith('seed-demo'))) {
  main()
}
