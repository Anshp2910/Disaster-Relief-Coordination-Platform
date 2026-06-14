import mongoose from 'mongoose'

const IncidentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    disasterType: {
      type: String,
      enum: ['Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other'],
      default: 'Other',
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Active', 'Monitoring', 'Resolved', 'Closed'],
      default: 'Active',
    },
    zones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    affectedPopulation: { type: Number, min: 0, default: 0 },
    centerLat: { type: Number, min: -90, max: 90 },
    centerLng: { type: Number, min: -180, max: 180 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

IncidentSchema.index({ location: '2dsphere' })
IncidentSchema.index({ status: 1 })
IncidentSchema.index({ disasterType: 1 })
IncidentSchema.index({ name: 'text', description: 'text' })

export const Incident = mongoose.model('Incident', IncidentSchema)
