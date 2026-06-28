import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: '' },
    role: { type: String, enum: ['volunteer', 'ngo', 'admin'], required: true },
    displayName: { type: String, required: true, trim: true },
    avatar: { type: String, trim: true, default: '' },
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId: { type: String, default: '' },
    skills: [{ type: String, enum: ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other'] }],
    phone: { type: String, trim: true, default: '' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
    resetPasswordToken: { type: String, default: undefined },
    resetPasswordExpires: { type: Date, default: undefined },
  },
  { timestamps: true },
)

UserSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
}

UserSchema.methods.verifyPassword = async function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash)
}

export const User = mongoose.model('User', UserSchema)
