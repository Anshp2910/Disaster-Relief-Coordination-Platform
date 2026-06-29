import mongoose from 'mongoose'

const ZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    centerLat: { type: Number, required: true, min: -90, max: 90 },
    centerLng: { type: Number, required: true, min: -180, max: 180 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    radiusKm: { type: Number, required: true, min: 1, max: 500, default: 10 },
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
    disasterType: {
      type: String,
      enum: ['Flood', 'Earthquake', 'Cyclone', 'Drought', 'Fire', 'Landslide', 'Other'],
      default: 'Other',
    },
    affectedPopulation: { type: Number, min: 0, default: 0 },
    coverageStatus: {
      type: String,
      enum: ['Covered', 'Partial', 'Gap'],
      default: 'Gap',
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

ZoneSchema.pre('save', function syncLocation() {
  if (this.centerLat != null && this.centerLng != null) {
    this.location = { type: 'Point', coordinates: [this.centerLng, this.centerLat] }
  }
})

ZoneSchema.index({ location: '2dsphere' })
ZoneSchema.index({ centerLat: 1, centerLng: 1 })
ZoneSchema.index({ severity: 1, status: 1 })
ZoneSchema.index({ name: 'text', description: 'text' })

export const Zone = mongoose.model('Zone', ZoneSchema)
