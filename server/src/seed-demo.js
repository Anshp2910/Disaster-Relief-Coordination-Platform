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
  'Jaipur Heat Wave Belt', 'Patna Ganga Floodplain', 'Hyderabad Urban Flood Zone',
  'Bengaluru Lake Overflow Zone', 'Lucknow Gomti River Basin', 'Varanasi River Erosion Zone',
  'Kochi Coastal Erosion Belt', 'Ranchi Tribal Flood Area', 'Nagaland Landslide Corridor',
  'Darjeeling Flash Flood Zone',
]

const INCIDENT_DATA = [
  { name: 'Cyclone Biparjoy - Gujarat Coast', disasterType: 'Cyclone', severity: 'Critical', affectedPopulation: 480000, lat: 22.2587, lng: 68.9631 },
  { name: 'Assam Brahmaputra Floods', disasterType: 'Flood', severity: 'Critical', affectedPopulation: 320000, lat: 26.2006, lng: 92.9376 },
  { name: 'Chennai Urban Floods - December', disasterType: 'Flood', severity: 'High', affectedPopulation: 210000, lat: 13.0827, lng: 80.2707 },
  { name: 'Uttarakhand Glacier Burst', disasterType: 'Landslide', severity: 'Critical', affectedPopulation: 15000, lat: 30.3752, lng: 79.5220 },
  { name: 'Maharashtra Heatwave', disasterType: 'Drought', severity: 'High', affectedPopulation: 95000, lat: 19.7515, lng: 75.7139 },
  { name: 'Kerala Monsoon Landslides', disasterType: 'Landslide', severity: 'High', affectedPopulation: 42000, lat: 10.8505, lng: 76.2711 },
  { name: 'Bihar Ganga Floods', disasterType: 'Flood', severity: 'Critical', affectedPopulation: 560000, lat: 25.0961, lng: 85.3131 },
  { name: 'Odisha Cyclone Dana', disasterType: 'Cyclone', severity: 'High', affectedPopulation: 280000, lat: 19.8135, lng: 85.8312 },
  { name: 'Rajasthan Drought Emergency', disasterType: 'Drought', severity: 'High', affectedPopulation: 175000, lat: 27.0238, lng: 74.2179 },
  { name: 'Himachal Pradesh Flash Floods', disasterType: 'Flood', severity: 'Medium', affectedPopulation: 35000, lat: 31.1048, lng: 77.1734 },
  { name: 'Delhi Air Pollution Crisis', disasterType: 'Other', severity: 'Medium', affectedPopulation: 1200000, lat: 28.7041, lng: 77.1025 },
  { name: 'Tamil Nadu Cyclone Mandous', disasterType: 'Cyclone', severity: 'High', affectedPopulation: 190000, lat: 12.2958, lng: 79.0779 },
  { name: 'Andhra Pradesh Floods - Godavari', disasterType: 'Flood', severity: 'High', affectedPopulation: 310000, lat: 17.1186, lng: 81.3472 },
  { name: 'West Bengal Sundarbans Cyclone', disasterType: 'Cyclone', severity: 'Critical', affectedPopulation: 420000, lat: 21.9497, lng: 89.1833 },
  { name: 'Jammu & Kashmir Flash Floods', disasterType: 'Flood', severity: 'High', affectedPopulation: 67000, lat: 33.7782, lng: 76.5762 },
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateLatLng(baseLat, baseLng) {
  return {
    lat: baseLat + (Math.random() - 0.5) * 0.02,
    lng: baseLng + (Math.random() - 0.5) * 0.02,
  }
}

export async function seedDemo() {
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

  const existingZones = await Zone.countDocuments()
  if (existingZones < ZONE_NAMES.length) {
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
  }

  const existingIncidents = await Incident.countDocuments()
  if (existingIncidents < INCIDENT_DATA.length) {
    console.log('[demo] creating incidents...')
    const zoneDocs = await Zone.find()
    for (let i = 0; i < INCIDENT_DATA.length; i++) {
      const inc = INCIDENT_DATA[i]
      const existing = await Incident.findOne({ name: inc.name })
      if (existing) continue
      const matchedZones = zoneDocs.filter((z) => {
        const dist = Math.sqrt(Math.pow(z.centerLat - inc.lat, 2) + Math.pow(z.centerLng - inc.lng, 2))
        return dist < 5
      })
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30))
      await Incident.create({
        name: inc.name,
        description: `A ${inc.disasterType.toLowerCase()} has affected the region around (${inc.lat.toFixed(2)}, ${inc.lng.toFixed(2)}). ${inc.affectedPopulation.toLocaleString()} people affected. Relief operations underway.`,
        disasterType: inc.disasterType,
        severity: inc.severity,
        status: inc.severity === 'Critical' ? 'Active' : pick(['Active', 'Monitoring']),
        zones: matchedZones.slice(0, 2).map((z) => z._id),
        startDate,
        affectedPopulation: inc.affectedPopulation,
        centerLat: inc.lat,
        centerLng: inc.lng,
        location: { type: 'Point', coordinates: [inc.lng, inc.lat] },
        createdBy: admin._id,
      })
    }
  }

  const existingCount = await Request.countDocuments()
  if (existingCount > 50) {
    console.log(`[demo] ${existingCount} requests already exist, skipping request seed`)
    const zoneCount = await Zone.countDocuments()
    const incCount = await Incident.countDocuments()
    console.log(`[demo] done: ${zoneCount} zones, ${incCount} incidents (requests skipped)`)
    return
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

  console.log('[demo] creating schedules...')
  const zoneDocs = await Zone.find()
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

  console.log('[demo] done: ${count} requests, 30 resources, zones and incidents seeded')
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
