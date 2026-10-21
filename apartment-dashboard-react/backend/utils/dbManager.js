import mongoose from 'mongoose'
import { PRIORITIES } from '../models/priorities.js'

class DatabaseManager {
  constructor() {
    this.connections = new Map()
    this.baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  }

  /**
   * Get or create a database connection for a specific apartment
   * @param {string} apartmentCode - The apartment code
   * @returns {Promise<mongoose.Connection>} - The database connection
   */
  async getApartmentConnection(apartmentCode) {
    if (!apartmentCode) {
      throw new Error('Apartment code is required')
    }

    // Normalize apartment code
    const normalizedCode = apartmentCode.toUpperCase()
    
    // Check if connection already exists
    if (this.connections.has(normalizedCode)) {
      const connection = this.connections.get(normalizedCode)
      if (connection.readyState === 1) { // Connected
        return connection
      }
    }

    try {
      // Create new connection for this apartment
      const dbName = `apartment_${normalizedCode.toLowerCase()}`
      const uri = `${this.baseUri}/${dbName}`
      
      const connection = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })

      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        if (connection.readyState === 1) {
          resolve()
        } else {
          connection.once('open', resolve)
          connection.once('error', reject)
        }
      })

      // Store the connection
      this.connections.set(normalizedCode, connection)
      
      console.log(`✅ Connected to apartment database: ${dbName}`)
      return connection
    } catch (error) {
      console.error(`❌ Failed to connect to apartment database for ${apartmentCode}:`, error)
      throw error
    }
  }

  /**
   * Get the main database connection (for user management)
   * @returns {Promise<mongoose.Connection>} - The main database connection
   */
  async getMainConnection() {
    if (this.mainConnection && this.mainConnection.readyState === 1) {
      return this.mainConnection
    }

    try {
      const uri = `${this.baseUri}/apartment-dashboard`
      this.mainConnection = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      
      console.log('✅ Connected to main apartment dashboard database')
      return this.mainConnection
    } catch (error) {
      console.error('❌ Failed to connect to main database:', error)
      throw error
    }
  }

  /**
   * Get models for a specific apartment
   * @param {string} apartmentCode - The apartment code
   * @returns {Promise<Object>} - Object containing apartment-specific models
   */
  async getApartmentModels(apartmentCode) {
    const connection = await this.getApartmentConnection(apartmentCode)
    
    // Check if models already exist for this connection
    if (connection.models.Task) {
      return {
        Task: connection.models.Task
      }
    }
    
    // Define apartment-specific models
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
      priority: {
        type: String,
        enum: PRIORITIES,
        default: 'normal'
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
      createdAt: {
        type: Date,
        default: Date.now
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
      
      next()
    })

    // Index for better query performance
    taskSchema.index({ user: 1, active: 1 })
    taskSchema.index({ user: 1, lastDone: 1 })

    return {
      Task: connection.model('Task', taskSchema)
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections() {
    for (const [code, connection] of this.connections) {
      try {
        await connection.close()
        console.log(`✅ Closed connection for apartment ${code}`)
      } catch (error) {
        console.error(`❌ Error closing connection for apartment ${code}:`, error)
      }
    }
    
    if (this.mainConnection) {
      try {
        await this.mainConnection.close()
        console.log('✅ Closed main database connection')
      } catch (error) {
        console.error('❌ Error closing main connection:', error)
      }
    }
    
    this.connections.clear()
    this.mainConnection = null
  }

  /**
   * Get connection status for all apartments
   * @returns {Object} - Status of all connections
   */
  getConnectionStatus() {
    const status = {
      main: this.mainConnection ? this.mainConnection.readyState : 0,
      apartments: {}
    }

    for (const [code, connection] of this.connections) {
      status.apartments[code] = connection.readyState
    }

    return status
  }
}

// Create singleton instance
const dbManager = new DatabaseManager()

export default dbManager
