import mongoose from 'mongoose'
import crypto from 'crypto'

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['volunteer', 'ngo', 'admin'], required: true },
    displayName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

UserSchema.methods.setPassword = function setPassword(password) {
  this.passwordHash = sha256(password)
}

UserSchema.methods.verifyPassword = function verifyPassword(password) {
  return this.passwordHash === sha256(password)
}

export const User = mongoose.model('User', UserSchema)
