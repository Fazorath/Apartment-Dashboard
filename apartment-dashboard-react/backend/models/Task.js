import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  assignedTo: {
    type: String,
    trim: true,
    maxlength: 50
  },
  frequencyDays: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  lastDone: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  pinned: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  lastCompleted: {
    type: Date
  },
  lastCompletedBy: {
    type: String,
    trim: true,
    maxlength: 50
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt field before saving
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Index for better query performance
taskSchema.index({ user: 1, active: 1 })
taskSchema.index({ user: 1, lastDone: 1 })

export default mongoose.model('Task', taskSchema)
