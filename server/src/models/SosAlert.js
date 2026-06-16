import mongoose from 'mongoose'

const SosAlertSchema = new mongoose.Schema(
  {
    message: { type: String, default: 'SOS Emergency Alert', trim: true },
    lat: { type: Number },
    lng: { type: Number },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

SosAlertSchema.index({ createdAt: -1 })
SosAlertSchema.index({ status: 1 })

export const SosAlert = mongoose.model('SosAlert', SosAlertSchema)
