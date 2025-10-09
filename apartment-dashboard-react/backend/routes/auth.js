import express from 'express'
import { getUserModel } from '../models/User.js'
import dbManager from '../utils/dbManager.js'
import {
  generateToken,
  validateApartmentCode,
  checkApartmentCodeAvailability,
  generateApartmentCode
} from '../middleware/auth.js'

const router = express.Router()

// Register
router.post('/register', validateApartmentCode, async (req, res) => {
  try {
    const { username, password, email, apartmentCode } = req.body

    // Validation
    if (!username || !password || !apartmentCode) {
      return res.status(400).json({ 
        error: 'Username, password, and apartment code are required' 
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    // Get User model
    const User = await getUserModel()

    // Check if user already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Check if apartment code exists (to join existing apartment)
    // If no users exist yet for this code but it is in allowed list, allow first user
    const existingApartment = await User.findOne({ apartmentCode })
    if (!existingApartment) {
      const allowedFirstUser = new Set((process.env.ALLOWED_APARTMENT_CODES || 'GP412,AL420').split(',').filter(Boolean).map(c => c.toUpperCase()))
      if (!allowedFirstUser.has(apartmentCode.toUpperCase())) {
        return res.status(400).json({ 
          error: 'Invalid apartment code. Please contact your apartment administrator for a valid code.' 
        })
      }
    }

    // Resolve apartment name (from existing apartment or allowlist mapping)
    const codeUpper = apartmentCode.toUpperCase()
    let apartmentName = existingApartment?.apartmentName
    if (!apartmentName) {
      const nameMap = {
        GP412: 'Gainesville Place 412',
        AL420: 'Alsander 420'
      }
      apartmentName = nameMap[codeUpper] || codeUpper
    }

    // Create new user for existing/allowed apartment
    const user = new User({
      username,
      password,
      email,
      apartmentCode: codeUpper,
      apartmentName
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        apartmentCode: user.apartmentCode,
        apartmentName: user.apartmentName,
        isAdmin: user.isAdmin
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, apartmentCode } = req.body

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Get User model
    const User = await getUserModel()

    // Find user by username
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // If apartment code is provided, validate it matches the user's apartment
    // Skip apartment code validation for admin users
    if (apartmentCode && user.apartmentCode !== apartmentCode.toUpperCase() && !user.isAdmin) {
      return res.status(401).json({ error: 'Invalid apartment code' })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        apartmentCode: user.apartmentCode,
        apartmentName: user.apartmentName,
        isAdmin: user.isAdmin
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const jwt = await import('jsonwebtoken')
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    
    const User = await getUserModel()
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        apartmentCode: user.apartmentCode,
        apartmentName: user.apartmentName,
        lastLogin: user.lastLogin
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Create apartment (admin only)
router.post('/create-apartment', validateApartmentCode, checkApartmentCodeAvailability, async (req, res) => {
  try {
    const { username, password, email, apartmentCode, apartmentName } = req.body

    // Validation
    if (!username || !password || !apartmentCode || !apartmentName) {
      return res.status(400).json({ 
        error: 'Username, password, apartment code, and apartment name are required' 
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    if (apartmentName.length < 2) {
      return res.status(400).json({ error: 'Apartment name must be at least 2 characters' })
    }

    // Get User model
    const User = await getUserModel()

    // Check if user already exists
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    // Create new apartment admin
    const user = new User({
      username,
      password,
      email,
      apartmentCode,
      apartmentName
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        apartmentCode: user.apartmentCode,
        apartmentName: user.apartmentName,
        isAdmin: user.isAdmin
      }
    })
  } catch (error) {
    console.error('Create apartment error:', error)
    res.status(500).json({ error: 'Failed to create apartment' })
  }
})

// Generate apartment code
router.get('/generate-apartment-code', async (req, res) => {
  try {
    const User = await getUserModel()
    let apartmentCode
    let attempts = 0
    const maxAttempts = 10

    // Generate unique apartment code
    do {
      apartmentCode = generateApartmentCode()
      const existingUser = await User.findOne({ apartmentCode })
      if (!existingUser) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique apartment code' })
    }

    res.json({
      success: true,
      apartmentCode
    })
  } catch (error) {
    console.error('Generate apartment code error:', error)
    res.status(500).json({ error: 'Failed to generate apartment code' })
  }
})

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' })
})

export default router
