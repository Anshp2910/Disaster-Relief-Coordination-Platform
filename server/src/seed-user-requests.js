import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import { User } from './models/User.js'
import { Request } from './models/Request.js'
import { logger } from './utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

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
  { name: 'Patna, Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Srinagar, Jammu & Kashmir', lat: 34.0837, lng: 74.7973 },
  { name: 'Dehradun, Uttarakhand', lat: 30.3165, lng: 78.0322 },
  { name: 'Kochi, Kerala', lat: 9.9312, lng: 76.2673 },
  { name: 'Nagpur, Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Surat, Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Varanasi, Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
]

const CATEGORIES = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Equipment', 'Other']
const STATUSES = ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

const REQUESTS = [
  { title: 'Medical camp needs doctors and nurses', category: 'Medical', priority: 'Critical', people: 200, desc: 'Severe flooding has cut off access to healthcare. Need a team of 5 doctors and 10 nurses for a temporary medical camp in the affected area.' },
  { title: 'Drinking water supply disrupted', category: 'Water', priority: 'Critical', people: 500, desc: 'Main water pipeline damaged due to earthquake. Need water tankers delivering 20000L daily until repairs complete.' },
  { title: 'Food rations for displaced families', category: 'Food', priority: 'High', people: 350, desc: '300 families displaced after cyclone. Need dry rations including rice, dal, oil, and spices for 2 weeks.' },
  { title: 'Emergency shelter for 150 people', category: 'Shelter', priority: 'Critical', people: 150, desc: 'School building being used as shelter but insufficient space. Need 30 large tents with flooring for temporary accommodation.' },
  { title: 'Rescue boats needed for stranded villagers', category: 'Rescue', priority: 'Critical', people: 80, desc: '80 people stranded on rooftops due to flash floods. Need 4 motorized rescue boats immediately.' },
  { title: 'First aid kits and bandages', category: 'Medical', priority: 'High', people: 400, desc: 'Running low on medical supplies at the relief camp. Need 200 first aid kits, bandages, antiseptic, and painkillers.' },
  { title: 'Search and rescue team for missing persons', category: 'Rescue', priority: 'Critical', people: 25, desc: '25 people reported missing after landslide. Need trained rescue team with sniffer dogs and thermal drones.' },
  { title: 'ORS packets and diarrhoea medicine', category: 'Medical', priority: 'High', people: 300, desc: 'Waterborne disease outbreak in relief camp. Need 5000 ORS packets and antibiotics for diarrhoea treatment.' },
  { title: 'Mosquito nets and repellents', category: 'Supplies', priority: 'Medium', people: 500, desc: 'Malaria cases rising in flood-affected area. Need 500 mosquito nets and insect repellent sprays.' },
  { title: 'Healthcare checkup camp for displaced families', category: 'Healthcare', priority: 'High', people: 300, desc: 'No access to primary healthcare after disaster. Need mobile health unit with general physicians and basic diagnostic equipment.' },
  { title: 'Clothes and blankets for winter', category: 'Clothing', priority: 'Medium', people: 250, desc: 'Cold wave has hit the region. Need warm clothes, blankets, and quilts for 250 people in temporary shelters.' },
  { title: 'Generators and fuel for power', category: 'Equipment', priority: 'High', people: 0, desc: 'Power lines down across the district. Need 5 diesel generators (10kVA) and 500L of diesel for relief operations.' },
  { title: 'Sanitation supplies for relief camp latrines', category: 'Sanitation', priority: 'High', people: 400, desc: 'Open defecation becoming a health risk. Need 500 hygiene kits, soap, bleaching powder, and sanitation workers for the camp.' },
  { title: 'Cooking utensils for community kitchen', category: 'Supplies', priority: 'Medium', people: 400, desc: 'Setting up a community kitchen to feed 400 people. Need large cooking vessels, plates, cups, and serving spoons.' },
  { title: 'Water purifiers and chlorine tablets', category: 'Water', priority: 'Critical', people: 600, desc: 'All water sources contaminated after floods. Need 20 water purifiers and 1000 chlorine tablets for safe drinking water.' },
  { title: 'Petrol for rescue vehicles', category: 'Supplies', priority: 'Critical', people: 0, desc: 'Rescue vehicles running out of fuel. Need 1000L of petrol and 500L of diesel for ambulance and rescue operations.' },
  { title: 'Ambulance service for critical patients', category: 'Medical', priority: 'Critical', people: 15, desc: '15 critical patients need evacuation to city hospital. Need 3 ambulances with paramedics for transport.' },
  { title: 'Blood donation camp setup', category: 'Medical', priority: 'High', people: 0, desc: 'Blood bank depleted after mass casualties. Need to organize a blood donation camp with medical staff and equipment.' },
  { title: 'Clean-up crew after cyclone', category: 'Other', priority: 'Medium', people: 100, desc: 'Debris blocking all major roads. Need 50 workers with shovels, wheelbarrows, and trucks for clean-up operation.' },
  { title: 'Counselling for trauma victims', category: 'Medical', priority: 'Medium', people: 120, desc: 'Many children and elderly showing trauma symptoms. Need 5 trained counsellors for mental health support sessions.' },
  { title: 'Satellite phones and communication gear', category: 'Communication', priority: 'Critical', people: 0, desc: 'All telecom towers damaged in the disaster. Need 20 satellite phones and a portable communication relay station for coordination.' },
  { title: 'Animal feed for livestock', category: 'Food', priority: 'Medium', people: 0, desc: 'Flood affected cattle and livestock. Need 500 bales of hay and 200kg of cattle feed.' },
  { title: 'Transport vehicles for relief distribution', category: 'Transportation', priority: 'High', people: 0, desc: 'Roads partially damaged, need 4 pickup trucks and 2 mini-trucks to transport supplies from warehouse to 5 remote villages.' },
  { title: 'School supplies for children', category: 'Supplies', priority: 'Low', people: 80, desc: 'Children in relief camp missing school. Need notebooks, pencils, bags, and storybooks for 80 children.' },
  { title: 'Wheelchair and mobility aids', category: 'Medical', priority: 'Medium', people: 20, desc: 'Elderly and disabled need mobility support. Need 10 wheelchairs, 15 walkers, and 20 crutches.' },
  { title: 'Portable toilets for relief camp', category: 'Shelter', priority: 'High', people: 300, desc: 'Sanitation crisis at the relief camp. Need 20 portable toilets with hygiene maintenance supplies.' },
  { title: 'Walkie-talkies for coordination', category: 'Equipment', priority: 'Medium', people: 0, desc: 'Mobile networks down, need reliable communication. Need 30 walkie-talkies with 10km range for team coordination.' },
  { title: 'Oxygen cylinders and concentrators', category: 'Medical', priority: 'Critical', people: 25, desc: 'COVID-like respiratory cases increasing. Need 20 oxygen cylinders and 5 oxygen concentrators.' },
  { title: 'Life jackets for rescue teams', category: 'Rescue', priority: 'High', people: 0, desc: 'Rescue teams operating in deep flood waters. Need 50 life jackets and 30 safety harnesses.' },
  { title: 'Power banks and flashlights', category: 'Equipment', priority: 'Medium', people: 200, desc: 'Night operations and no street lighting. Need 200 flashlights, batteries, and 50 power banks.' },
  { title: 'Sanitary pads and hygiene kits', category: 'Supplies', priority: 'High', people: 150, desc: 'Women and girls in relief camp need sanitary supplies. Need 300 sanitary napkin packs and hygiene kits.' },
  { title: 'Cooking gas cylinders', category: 'Food', priority: 'Medium', people: 0, desc: 'Community kitchen running low on fuel. Need 15 LPG cylinders with regulators for cooking.' },
  { title: 'PPE kits for health workers', category: 'Medical', priority: 'High', people: 0, desc: 'Health workers exposed to infections. Need 200 PPE kits including masks, gloves, gowns, and face shields.' },
  { title: 'Stretchers for patient transport', category: 'Medical', priority: 'High', people: 0, desc: 'Need to evacuate injured from remote areas. Need 30 lightweight stretchers for patient transport.' },
  { title: 'Vaccination drive for children', category: 'Medical', priority: 'High', people: 200, desc: 'Routine vaccinations disrupted. Need medical team to vaccinate 200 children under 5 against measles and polio.' },
  { title: 'Support for elderly evacuation', category: 'Rescue', priority: 'Critical', people: 35, desc: '35 elderly people stranded in a nursing home. Need special transport and medical support for evacuation.' },
  { title: 'Survey team for damage assessment', category: 'Other', priority: 'Medium', people: 0, desc: 'Need a team of 10 surveyors to assess structural damage and report to district authorities.' },
  { title: 'Hot cooked meals for stranded', category: 'Food', priority: 'Critical', people: 200, desc: 'People stranded on highway due to flooding. Need 200 hot meal packets delivered by boat.' },
  { title: 'Power restoration for relief camp', category: 'Power', priority: 'Critical', people: 500, desc: 'Complete blackout in the region. Need 3 industrial generators with 24hr fuel supply to power hospital, camp lighting, and water pumps.' },
  { title: 'Drinking water testing kits', category: 'Water', priority: 'Medium', people: 0, desc: 'Need to test water sources for contamination. Require 50 water testing kits and a mobile lab.' },
  { title: 'Trash disposal and waste management', category: 'Other', priority: 'Low', people: 500, desc: 'Accumulated waste in relief camp causing health hazards. Need waste disposal service and garbage bins.' },
  { title: 'Temporary bridge repair materials', category: 'Equipment', priority: 'High', people: 0, desc: 'Bridge washed away cutting off 3 villages. Need Bailey bridge components and engineering team.' },
  { title: 'Inflatable rescue boats with motors', category: 'Rescue', priority: 'Critical', people: 0, desc: 'Wide area flooding requires water rescue. Need 6 inflatable boats with outboard motors.' },
  { title: 'Solar lanterns for lighting', category: 'Equipment', priority: 'Low', people: 300, desc: 'No grid power for weeks. Need 300 solar lanterns for families in remote villages.' },
  { title: 'Trained dogs for search operations', category: 'Rescue', priority: 'High', people: 0, desc: 'Building collapses after earthquake. Need 4 trained search and rescue dogs with handlers.' },
  { title: 'Water storage tanks', category: 'Water', priority: 'High', people: 400, desc: 'Need 10 large collapsible water storage tanks (1000L each) for storing drinking water at camp.' },
  { title: 'Birthing kits and maternal care', category: 'Medical', priority: 'High', people: 15, desc: '15 pregnant women in relief camp due any day. Need birthing kits, midwife, and emergency transport.' },
  { title: 'Fire extinguishers and safety gear', category: 'Supplies', priority: 'Medium', people: 0, desc: 'Gas leaks and fire risk in debris. Need 30 fire extinguishers and safety helmets for workers.' },
  { title: 'Road and bridge infrastructure repair', category: 'Infrastructure', priority: 'High', people: 0, desc: 'Critical bridge connecting 3 villages partially collapsed. Need engineering assessment, repair materials, and construction crew.' },
  { title: 'Document recovery and storage', category: 'Other', priority: 'Low', people: 50, desc: 'People lost IDs and documents in flood. Need waterproof storage boxes and help with document replacement.' },
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateLatLng(baseLat, baseLng) {
  return {
    lat: baseLat + (Math.random() - 0.5) * 0.02,
    lng: baseLng + (Math.random() - 0.5) * 0.02,
  }
}

export async function seedUserRequests(userEmail) {
  let user = null
  if (userEmail) {
    user = await User.findOne({ email: userEmail })
  }
  if (!user) {
    user = await User.findOne({ role: 'admin' })
  }
  if (!user) {
    const admin = new User({
      email: 'admin@relief.gov.in',
      role: 'admin',
      displayName: 'Admin',
    })
    await admin.setPassword('Admin@123')
    await admin.save()
    user = admin
    logger.info('[seed-user] created admin user')
  }

  const existingCount = await Request.countDocuments()
  logger.info(`[seed-user] existing requests: ${existingCount}`)

  const existingAdminRequests = await Request.countDocuments({ createdBy: user._id })
  if (existingAdminRequests > 0) {
    logger.info(`[seed-user] deleting ${existingAdminRequests} existing requests by ${user.email}...`)
    await Request.deleteMany({ createdBy: user._id })
  }

  const count = Math.min(REQUESTS.length, 50)
  logger.info(`[seed-user] creating ${count} requests for user ${user.email}...`)

  for (let i = 0; i < count; i++) {
    const reqData = REQUESTS[i]
    const loc = pick(LOCATIONS.filter((l) => l !== REQUESTS[i % REQUESTS.length]))
    const offset = generateLatLng(loc.lat, loc.lng)

    const statusPool = i < 10 ? ['Open'] : i < 20 ? ['Open', 'Pending'] : STATUSES
    const status = pick(statusPool)
    const daysAgo = Math.floor(Math.random() * 30) + 1
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - daysAgo)

    await Request.create({
      title: reqData.title,
      description: `${reqData.desc} Location: ${loc.name}. Approximately ${reqData.people > 0 ? reqData.people + ' people' : 'multiple families'} affected in this area.`,
      locationName: loc.name,
      lat: offset.lat,
      lng: offset.lng,
      location: { type: 'Point', coordinates: [offset.lng, offset.lat] },
      status,
      category: reqData.category,
      priority: reqData.priority,
      peopleCount: reqData.people || Math.floor(Math.random() * 100) + 10,
      createdBy: user._id,
      createdAt,
      auditLog: [{ action: 'created', by: user._id, timestamp: createdAt }],
    })
  }

  const afterCount = await Request.countDocuments()
  logger.info(`[seed-user] done. Total requests now: ${afterCount}`)
}

async function main() {
  try {
    await connectDB()
    const email = process.argv[2] || null
    await seedUserRequests(email)
  } catch (err) {
    logger.error('[seed-user] error', { message: err.message, stack: err.stack })
  } finally {
    await mongoose.connection.close()
  }
}

if (process.argv[1] && (process.argv[1].endsWith('seed-user-requests.js') || process.argv[1].endsWith('seed-user-requests'))) {
  main()
}
