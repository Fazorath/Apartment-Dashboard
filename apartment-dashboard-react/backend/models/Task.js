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
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        return Array.isArray(v)
      },
      message: 'Tags must be an array'
    }
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
  previousLastDone: {
    type: Date
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
  
  // Ensure tags is always an array
  if (!Array.isArray(this.tags)) {
    this.tags = []
  }
  
  console.log('Pre-save: tags =', this.tags) // Debug log
  next()
})

// Debug after save
taskSchema.post('save', function(doc) {
  console.log('Post-save: tags =', doc.tags) // Debug log
})

// Index for better query performance
taskSchema.index({ user: 1, active: 1 })
taskSchema.index({ user: 1, lastDone: 1 })

export default mongoose.model('Task', taskSchema)
