import mongoose from 'mongoose'

const ResourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, maxlength: 50 },
    locationName: { type: String, default: '', trim: true, maxlength: 500 },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    status: {
      type: String,
      enum: ['Available', 'Low', 'Depleted', 'Reserved'],
      default: 'Available',
    },
    allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', default: null },
    allocatedQuantity: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, maxlength: 2000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

ResourceSchema.index({ location: '2dsphere' })
ResourceSchema.index({ category: 1, status: 1 })
ResourceSchema.index({ locationName: 'text', name: 'text' })

export const Resource = mongoose.model('Resource', ResourceSchema)
