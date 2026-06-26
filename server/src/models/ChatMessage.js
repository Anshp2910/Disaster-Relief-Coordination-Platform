import mongoose from 'mongoose'

const ChatMessageSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ['message', 'system', 'sos'],
      default: 'message',
    },
  },
  { timestamps: true },
)

ChatMessageSchema.index({ requestId: 1, createdAt: -1 })

export const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema)
