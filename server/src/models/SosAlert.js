import mongoose from 'mongoose'

const SosAlertSchema = new mongoose.Schema(
  {
    message: { type: String, default: 'SOS Emergency Alert', trim: true },
    lat: { type: Number },
    lng: { type: Number },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' },
    },
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
SosAlertSchema.index({ location: '2dsphere' })
SosAlertSchema.index({ status: 1, createdAt: -1 })

SosAlertSchema.pre('save', function syncLocation() {
  if (this.lat != null && this.lng != null) {
    this.location = { type: 'Point', coordinates: [this.lng, this.lat] }
  } else {
    // Clear location to prevent partial GeoJSON ({ type: 'Point' } without
    // coordinates) from being rejected by the 2dsphere index.
    this.$set('location', undefined)
  }
})

export const SosAlert = mongoose.model('SosAlert', SosAlertSchema)
