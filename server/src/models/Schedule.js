import mongoose from 'mongoose'

const ScheduleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    shift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Night', 'Full Day'],
      default: 'Full Day',
    },
    skills: [{ type: String, enum: ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other'] }],
    status: {
      type: String,
      enum: ['Scheduled', 'Active', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
)

ScheduleSchema.index({ userId: 1, startDate: -1 })
ScheduleSchema.index({ zoneId: 1, startDate: -1 })

export const Schedule = mongoose.model('Schedule', ScheduleSchema)
