import mongoose from 'mongoose'

const CommentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const AuditEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
})

const RequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    locationName: { type: String, default: '', trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' },
    },

    status: {
      type: String,
      enum: ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled'],
      default: 'Open',
    },
    category: {
      type: String,
      enum: ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Equipment', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },

    files: [{
      url: String,
      filename: String,
      mimetype: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now },
    }],

    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    claimedAt: { type: Date, default: null },
    peopleCount: { type: Number, default: 1 },

    comments: [CommentSchema],
    auditLog: [AuditEntrySchema],

    escalated: { type: Boolean, default: false },
    escalatedAt: { type: Date, default: null },
    escalationReason: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

RequestSchema.pre('save', function syncLocation() {
  if (this.lat != null && this.lng != null) {
    this.location = { type: 'Point', coordinates: [this.lng, this.lat] }
  }
})

RequestSchema.pre('save', function capAuditLog() {
  if (this.auditLog && this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(this.auditLog.length - 100)
  }
})

RequestSchema.index({ location: '2dsphere' })
RequestSchema.index({ status: 1 })
RequestSchema.index({ category: 1 })
RequestSchema.index({ createdAt: -1 })
RequestSchema.index({ title: 'text', description: 'text', locationName: 'text' })
RequestSchema.index({ createdBy: 1, createdAt: -1 })
RequestSchema.index({ claimedBy: 1 })
RequestSchema.index({ escalated: 1, createdAt: -1 })

export const Request = mongoose.model('Request', RequestSchema)
