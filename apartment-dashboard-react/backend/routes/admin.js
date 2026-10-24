import express from 'express'
import { getUserModel } from '../models/User.js'
import dbManager from '../utils/dbManager.js'
import { MongoClient } from 'mongodb'

const router = express.Router()

// Get all apartments and their users
router.get('/apartments', async (req, res) => {
  try {
    const User = await getUserModel()
    
    // Get all users grouped by apartment
    const users = await User.find({}).select('+password') // Include password for admin view
    
    // Group users by apartment
    const apartments = {}
    users.forEach(user => {
      const apartmentCode = user.apartmentCode
      if (!apartments[apartmentCode]) {
        apartments[apartmentCode] = {
          code: apartmentCode,
          name: user.apartmentName,
          users: [],
          totalUsers: 0,
          createdAt: user.createdAt
        }
      }
      apartments[apartmentCode].users.push({
        id: user._id,
        username: user.username,
        email: user.email,
        password: user.password, // Include hashed password
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isAdmin: user.isAdmin
      })
      apartments[apartmentCode].totalUsers++
    })

    // Convert to array and sort by apartment code
    const apartmentsArray = Object.values(apartments).sort((a, b) => 
      a.code.localeCompare(b.code)
    )

    res.json({
      success: true,
      apartments: apartmentsArray,
      totalApartments: apartmentsArray.length,
      totalUsers: users.length
    })
  } catch (error) {
    console.error('Get apartments error:', error)
    res.status(500).json({ error: 'Failed to fetch apartments data' })
  }
})

// Get database status and connections
router.get('/database-status', async (req, res) => {
  try {
    const status = await dbManager.getConnectionStatus()
    
    // Get list of all apartment databases
    const User = await getUserModel()
    const apartments = await User.distinct('apartmentCode')
    
    const apartmentDatabases = apartments.map(code => ({
      apartmentCode: code,
      databaseName: `apartment_${code.toLowerCase()}`,
      status: status.apartments[code] || 0
    }))

    res.json({
      success: true,
      mainDatabase: {
        name: 'apartment-dashboard',
        status: status.main
      },
      apartmentDatabases,
      totalConnections: Object.keys(status.apartments).length + 1
    })
  } catch (error) {
    console.error('Database status error:', error)
    res.status(500).json({ error: 'Failed to fetch database status' })
  }
})

// Get detailed apartment information including tasks
router.get('/apartment/:code', async (req, res) => {
  try {
    const { code } = req.params
    const apartmentCode = code.toUpperCase()

    // Get users for this apartment
    const User = await getUserModel()
    const users = await User.find({ apartmentCode }).select('+password')

    // Get tasks for this apartment
    let tasks = []
    try {
      const apartmentModels = await dbManager.getApartmentModels(apartmentCode)
      tasks = await apartmentModels.Task.find({})
    } catch {
      console.log(`No tasks found for apartment ${apartmentCode}`)
    }

    res.json({
      success: true,
      apartment: {
        code: apartmentCode,
        name: users[0]?.apartmentName || 'Unknown',
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          password: user.password,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isAdmin: user.isAdmin
        })),
        tasks: tasks.map(task => ({
          id: task._id,
          name: task.name,
          assignedTo: task.assignedTo,
          frequencyDays: task.frequencyDays,
          lastDone: task.lastDone,
          pinned: task.pinned,
          active: task.active,
          createdAt: task.createdAt
        })),
        totalUsers: users.length,
        totalTasks: tasks.length
      }
    })
  } catch (error) {
    console.error('Get apartment details error:', error)
    res.status(500).json({ error: 'Failed to fetch apartment details' })
  }
})

// Create admin user
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password, email } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const User = await getUserModel()
    
    // Check if user already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Create admin user
    const adminUser = new User({
      username,
      password,
      email,
      apartmentCode: 'ADMIN',
      apartmentName: 'Admin Panel',
      isAdmin: true
    })

    await adminUser.save()

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: adminUser._id,
        username: adminUser.username,
        email: adminUser.email,
        isAdmin: adminUser.isAdmin,
        createdAt: adminUser.createdAt
      }
    })
  } catch (error) {
    console.error('Create admin error:', error)
    res.status(500).json({ error: 'Failed to create admin user' })
  }
})

// Test endpoint to verify admin access
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Admin access working!',
      user: req.user,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Admin test error:', error)
    res.status(500).json({ error: 'Admin test failed' })
  }
})

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const User = await getUserModel()
    
    const totalUsers = await User.countDocuments()
    const totalAdmins = await User.countDocuments({ isAdmin: true })
    const totalApartments = await User.distinct('apartmentCode').then(codes => codes.length)
    
    // Get recent activity
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username apartmentCode createdAt')

    const recentLogins = await User.find({ lastLogin: { $exists: true } })
      .sort({ lastLogin: -1 })
      .limit(5)
      .select('username apartmentCode lastLogin')

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalApartments,
        recentUsers,
        recentLogins
      }
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to fetch system statistics' })
  }
})

export default router

// Admin only: reset system to an allowlist of apartment codes and zero users
// Body: { allowedCodes: ["GP412","AL420"] }
router.post('/reset-system', async (req, res) => {
  const { allowedCodes = [] } = req.body || {}
  const allowedSet = new Set((allowedCodes || []).map(c => String(c).toUpperCase()))
  const dropped = []
  const ensured = []
  let deletedUsers = 0
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
    const client = new MongoClient(mongoUri)
    await client.connect()
    try {
      const admin = client.db().admin()
      const info = await admin.listDatabases()
      for (const db of info?.databases || []) {
        const name = db.name
        if (!name.startsWith('apartment_')) continue
        const code = name.replace('apartment_', '').toUpperCase()
        if (!allowedSet.has(code)) {
          await client.db(name).dropDatabase()
          dropped.push(name)
        }
      }
    } finally {
      await client.close()
    }

    // Delete all users from main DB
    const User = await getUserModel()
    const del = await User.deleteMany({})
    deletedUsers = del.deletedCount || 0

    // Ensure allowed apartment DBs exist and are empty of tasks
    for (const code of allowedSet) {
      const models = await dbManager.getApartmentModels(code)
      await models.Task.deleteMany({})
      ensured.push(code)
    }

    res.json({ success: true, dropped, deletedUsers, ensured })
  } catch (error) {
    console.error('reset-system error:', error)
    res.status(500).json({ error: 'Failed to reset system', details: error.message })
  }
})
