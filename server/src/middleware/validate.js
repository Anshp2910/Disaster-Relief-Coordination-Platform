import Joi from 'joi'

const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('volunteer', 'ngo').required(),
    displayName: Joi.string().min(1).max(100).required().trim(),
  }),

  login: Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required(),
  }),

  createRequest: Joi.object({
    title: Joi.string().min(1).max(200).required().trim(),
    description: Joi.string().min(1).max(5000).required().trim(),
    locationName: Joi.string().min(1).max(500).required().trim(),
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    status: Joi.string().valid('Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled'),
    category: Joi.string().valid('Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other'),
    priority: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    peopleCount: Joi.number().integer().min(1).max(10000),
  }),

  updateRequest: Joi.object({
    title: Joi.string().min(1).max(200).trim(),
    description: Joi.string().min(1).max(5000).trim(),
    locationName: Joi.string().min(1).max(500).trim(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    status: Joi.string().valid('Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled'),
    category: Joi.string().valid('Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other'),
    priority: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    peopleCount: Joi.number().integer().min(1).max(10000),
  }).min(1),

  comment: Joi.object({
    text: Joi.string().min(1).max(2000).required().trim(),
  }),

  createResource: Joi.object({
    name: Joi.string().min(1).max(200).required().trim(),
    category: Joi.string().valid('Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other').required(),
    quantity: Joi.number().min(0).required(),
    unit: Joi.string().min(1).max(50).required().trim(),
    locationName: Joi.string().min(1).max(500).required().trim(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    notes: Joi.string().max(2000).trim(),
  }),

  updateResource: Joi.object({
    name: Joi.string().min(1).max(200).trim(),
    category: Joi.string().valid('Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other'),
    quantity: Joi.number().min(0),
    unit: Joi.string().min(1).max(50).trim(),
    locationName: Joi.string().min(1).max(500).trim(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    notes: Joi.string().max(2000).trim(),
    status: Joi.string().valid('Available', 'Low', 'Depleted', 'Reserved'),
  }).min(1),

  allocateResource: Joi.object({
    requestId: Joi.string().required(),
    allocQuantity: Joi.number().min(1).required(),
  }),

  deallocateResource: Joi.object({
    deallocQuantity: Joi.number().min(1).required(),
  }),

  createZone: Joi.object({
    name: Joi.string().min(1).max(200).required().trim(),
    description: Joi.string().max(2000).trim(),
    centerLat: Joi.number().min(-90).max(90).required(),
    centerLng: Joi.number().min(-180).max(180).required(),
    radiusKm: Joi.number().min(1).max(500).default(10),
    severity: Joi.string().valid('Critical', 'High', 'Medium', 'Low').default('Medium'),
    status: Joi.string().valid('Active', 'Monitoring', 'Resolved', 'Closed').default('Active'),
    disasterType: Joi.string().valid('Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other').default('Other'),
    affectedPopulation: Joi.number().min(0).default(0),
    notes: Joi.string().max(2000).trim(),
  }),

  updateZone: Joi.object({
    name: Joi.string().min(1).max(200).trim(),
    description: Joi.string().max(2000).trim(),
    centerLat: Joi.number().min(-90).max(90),
    centerLng: Joi.number().min(-180).max(180),
    radiusKm: Joi.number().min(1).max(500),
    severity: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    status: Joi.string().valid('Active', 'Monitoring', 'Resolved', 'Closed'),
    disasterType: Joi.string().valid('Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other'),
    affectedPopulation: Joi.number().min(0),
    notes: Joi.string().max(2000).trim(),
  }).min(1),

  chatMessage: Joi.object({
    text: Joi.string().min(1).max(2000).required().trim(),
  }),

  feedback: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(2000).trim(),
    deliveryConfirmed: Joi.boolean(),
  }),

  createSchedule: Joi.object({
    userId: Joi.string().required(),
    zoneId: Joi.string(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required().greater(Joi.ref('startDate')),
    shift: Joi.string().valid('Morning', 'Afternoon', 'Night', 'Full Day'),
    skills: Joi.array().items(Joi.string().valid('Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other')),
    notes: Joi.string().max(1000).trim(),
  }),

  updateSchedule: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date(),
    shift: Joi.string().valid('Morning', 'Afternoon', 'Night', 'Full Day'),
    skills: Joi.array().items(Joi.string().valid('Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other')),
    status: Joi.string().valid('Scheduled', 'Active', 'Completed', 'Cancelled'),
    notes: Joi.string().max(1000).trim(),
  }).min(1),

  createIncident: Joi.object({
    name: Joi.string().min(1).max(200).required().trim(),
    description: Joi.string().max(5000).trim(),
    disasterType: Joi.string().valid('Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other'),
    severity: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    status: Joi.string().valid('Active', 'Monitoring', 'Resolved', 'Closed'),
    zones: Joi.array().items(Joi.string()),
    startDate: Joi.date(),
    affectedPopulation: Joi.number().min(0),
    centerLat: Joi.number().min(-90).max(90),
    centerLng: Joi.number().min(-180).max(180),
  }),

  updateIncident: Joi.object({
    name: Joi.string().min(1).max(200).trim(),
    description: Joi.string().max(5000).trim(),
    disasterType: Joi.string().valid('Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other'),
    severity: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    status: Joi.string().valid('Active', 'Monitoring', 'Resolved', 'Closed'),
    zones: Joi.array().items(Joi.string()),
    endDate: Joi.date(),
    affectedPopulation: Joi.number().min(0),
    centerLat: Joi.number().min(-90).max(90),
    centerLng: Joi.number().min(-180).max(180),
  }).min(1),

  sosAlert: Joi.object({
    message: Joi.string().max(1000).trim(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    zoneId: Joi.string(),
  }),

  updateProfile: Joi.object({
    displayName: Joi.string().min(1).max(100).trim(),
    currentPassword: Joi.string(),
    newPassword: Joi.string().min(6).max(128),
    phone: Joi.string().max(20).trim(),
    skills: Joi.array().items(Joi.string().valid('Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other')),
    notifications: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
    }),
  }).or('displayName', 'newPassword', 'phone', 'skills', 'notifications'),
}

export function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName]
    if (!schema) return next()

    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const msg = error.details.map((d) => d.message).join(', ')
      return res.status(400).json({ error: msg })
    }
    req.body = value
    return next()
  }
}
