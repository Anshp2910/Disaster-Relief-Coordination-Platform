import mongoose from 'mongoose'

const FeedbackSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 2000 },
    deliveryConfirmed: { type: Boolean, default: false },
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fulfilledAt: { type: Date },
  },
  { timestamps: true },
)

FeedbackSchema.index({ requestId: 1 })
FeedbackSchema.index({ requestId: 1, submittedBy: 1 }, { unique: true, sparse: true })

export const Feedback = mongoose.model('Feedback', FeedbackSchema)
