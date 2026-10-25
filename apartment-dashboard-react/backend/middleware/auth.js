import jwt from 'jsonwebtoken'
import { getUserModel } from '../models/User.js'
import dbManager from '../utils/dbManager.js'

/**
 * Middleware to authenticate token and set apartment context
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    
    // Get user from main database
    const User = await getUserModel()
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user || isTokenStale(decoded, user)) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Set user and apartment context
    req.user = user
    req.apartmentCode = user.apartmentCode
    
    // Get apartment-specific models and attach to request
    req.apartmentModels = await dbManager.getApartmentModels(user.apartmentCode)
    
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(500).json({ error: 'Authentication error' })
  }
}

/**
 * Middleware to validate apartment code format
 */
export const validateApartmentCode = (req, res, next) => {
  const { apartmentCode } = req.body
  
  if (!apartmentCode) {
    return res.status(400).json({ error: 'Apartment code is required' })
  }
  
  // Validate format: 4-8 characters, alphanumeric, uppercase
  const codeRegex = /^[A-Z0-9]{4,8}$/
  if (!codeRegex.test(apartmentCode.toUpperCase())) {
    return res.status(400).json({ 
      error: 'Apartment code must be 4-8 characters, alphanumeric only' 
    })
  }
  
  // Normalize to uppercase
  req.body.apartmentCode = apartmentCode.toUpperCase()
  next()
}

/**
 * Middleware to check if apartment code is available (for registration)
 */
export const checkApartmentCodeAvailability = async (req, res, next) => {
  try {
    const { apartmentCode } = req.body
    
    const User = await getUserModel()
    const existingUser = await User.findOne({ apartmentCode })
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Apartment code already exists. Please choose a different code.' 
      })
    }
    
    next()
  } catch (error) {
    console.error('Apartment code check error:', error)
    res.status(500).json({ error: 'Failed to validate apartment code' })
  }
}

// A token carries the password-change time it was issued under (`pwc`, in ms; 0 if
// never changed), so a reset signs out older sessions without a same-second race
// between `iat` (whole seconds) and the change time
const passwordChangeStamp = (passwordChangedAt) => passwordChangedAt ? new Date(passwordChangedAt).getTime() : 0

/**
 * True when the user's password changed after this token was issued
 */
export const isTokenStale = (decoded, user) => (decoded.pwc ?? 0) !== passwordChangeStamp(user.passwordChangedAt)

/**
 * Generate JWT token with user ID
 */
export const generateToken = (userId, passwordChangedAt) => {
  return jwt.sign(
    { userId, pwc: passwordChangeStamp(passwordChangedAt) },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  )
}

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    next()
  } catch (error) {
    console.error('Admin check error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

/**
 * Generate a random apartment code
 */
export const generateApartmentCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}