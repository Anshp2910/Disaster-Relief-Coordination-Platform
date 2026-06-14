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
    status: Joi.string().valid('Open', 'In Progress', 'Resolved', 'Fulfilled'),
    category: Joi.string().valid('Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Other'),
    priority: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    peopleCount: Joi.number().integer().min(1).max(10000),
  }),

  updateRequest: Joi.object({
    title: Joi.string().min(1).max(200).trim(),
    description: Joi.string().min(1).max(5000).trim(),
    locationName: Joi.string().min(1).max(500).trim(),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    status: Joi.string().valid('Open', 'In Progress', 'Resolved', 'Fulfilled'),
    category: Joi.string().valid('Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Other'),
    priority: Joi.string().valid('Critical', 'High', 'Medium', 'Low'),
    peopleCount: Joi.number().integer().min(1).max(10000),
  }).min(1),

  updateProfile: Joi.object({
    displayName: Joi.string().min(1).max(100).trim(),
    currentPassword: Joi.string(),
    newPassword: Joi.string().min(6).max(128),
  }).or('displayName', 'newPassword'),

  comment: Joi.object({
    text: Joi.string().min(1).max(2000).required().trim(),
  }),
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
