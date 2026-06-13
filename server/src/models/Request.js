import mongoose from 'mongoose'

const RequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    locationName: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Fulfilled'],
      default: 'Open',
    },
    category: {
      type: String,
      enum: ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

export const Request = mongoose.model('Request', RequestSchema)
