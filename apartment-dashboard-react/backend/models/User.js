import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dbManager from '../utils/dbManager.js'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationTokenHash: {
    type: String,
    index: { sparse: true }
  },
  emailVerificationExpires: {
    type: Date
  },
  passwordResetTokenHash: {
    type: String,
    index: { sparse: true }
  },
  passwordResetExpires: {
    type: Date
  },
  // Tokens issued before this are rejected (see isTokenStale in middleware/auth.js)
  passwordChangedAt: {
    type: Date
  },
  apartmentCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    minlength: 4,
    maxlength: 8,
    match: /^[A-Z0-9]+$/
  },
  apartmentName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject()
  delete user.password
  delete user.emailVerificationTokenHash
  delete user.emailVerificationExpires
  delete user.passwordResetTokenHash
  delete user.passwordResetExpires
  return user
}

// Function to get User model with proper connection
export const getUserModel = async () => {
  const connection = await dbManager.getMainConnection()
  return connection.model('User', userSchema)
}

// For backward compatibility, export a function that returns the model
export default async () => {
  return await getUserModel()
}
