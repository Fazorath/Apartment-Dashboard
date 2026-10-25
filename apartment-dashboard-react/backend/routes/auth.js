import express from 'express'
import rateLimit from 'express-rate-limit'
import { getUserModel } from '../models/User.js'
import {
  authenticateToken,
  generateToken,
  generateTwoFactorToken,
  verifyTwoFactorToken,
  isSessionToken,
  isTokenStale,
  validateApartmentCode,
  checkApartmentCodeAvailability,
  generateApartmentCode
} from '../middleware/auth.js'
import { checkPassword } from '../utils/passwordPolicy.js'
import { sendVerificationEmail, verifyEmailToken } from '../utils/emailVerification.js'
import { requestPasswordReset, resetPasswordWithToken } from '../utils/passwordReset.js'
import { startTwoFactorSetup, confirmTwoFactor, checkSecondFactor, disableTwoFactor } from '../utils/twoFactor.js'
import { INVALID_APARTMENT_CODE, joinableApartmentName } from '../utils/apartments.js'
import {
  createSignupToken,
  createState,
  exchangeGoogleCode,
  googleAuthUrl,
  isGoogleConfigured,
  readSignupToken,
  readState
} from '../utils/googleOAuth.js'

const router = express.Router()

// A mail outage shouldn't block sign-up; the roommate can resend from settings
const trySendVerificationEmail = async (user) => {
  try {
    await sendVerificationEmail(user)
  } catch (error) {
    console.error('Verification email error:', error)
  }
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isEmail = (value) => typeof value === 'string' && EMAIL_FORMAT.test(value.trim())

// Every route that sends a verification email shares this budget, keyed by
// account, so one roommate can't flood an inbox by resending or switching addresses
const verificationEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many verification emails. Try again in a few minutes.' }
})

// Keyed by what was typed, not by whether an account matches, so hitting the
// limit looks the same for real and made-up accounts and a flood can't fill one inbox
const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => String(req.body?.identifier ?? '').trim().toLowerCase(),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Try again in a few minutes.' }
})

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' }
})

// The user as the frontend keeps it after signing in
const sessionUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  emailVerified: user.emailVerified,
  googleLinked: Boolean(user.googleId),
  apartmentCode: user.apartmentCode,
  apartmentName: user.apartmentName,
  isAdmin: user.isAdmin,
  twoFactorEnabled: user.twoFactorEnabled
})

// Record the login and issue a session token
const startSession = async (user) => {
  user.lastLogin = new Date()
  await user.save()

  return {
    success: true,
    message: 'Login successful',
    token: generateToken(user._id, user.passwordChangedAt),
    user: sessionUser(user)
  }
}

// Wrong 2FA codes, counted per account across sign-in, setup and turning it off, so
// fresh pending tokens don't buy more guesses. Successful codes don't count.
const twoFactorCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => String(req.user?._id ?? verifyTwoFactorToken(req.body?.twoFactorToken)?.userId),
  // A missing or bad pending token is turned away before any code is checked
  skip: (req) => !req.user && !verifyTwoFactorToken(req.body?.twoFactorToken),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many wrong codes. Try again in a few minutes.' }
})

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

    if (email && !isEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }

    const passwordCheck = checkPassword(password, { username })
    if (!passwordCheck.ok) {
      return res.status(400).json({ error: 'Choose a stronger password', reasons: passwordCheck.reasons })
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

    const apartmentName = await joinableApartmentName(User, apartmentCode)
    if (!apartmentName) {
      return res.status(400).json({ error: INVALID_APARTMENT_CODE })
    }
    const codeUpper = apartmentCode.toUpperCase()

    // Create new user for existing/allowed apartment
    const user = new User({
      username,
      password,
      email,
      apartmentCode: codeUpper,
      apartmentName
    })

    await user.save()
    if (user.email) await trySendVerificationEmail(user)

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: sessionUser(user)
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

    // With 2FA on, the password alone only earns a pending token for /login/2fa
    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        twoFactorRequired: true,
        twoFactorToken: generateTwoFactorToken(user._id, user.passwordChangedAt)
      })
    }

    res.json(await startSession(user))
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

const TWO_FACTOR_EXPIRED = { error: 'Your sign-in timed out. Enter your password again.', reason: 'expired' }

// Second login step: trade a 2FA pending token and a code (from the app, or a recovery code) for a session
router.post('/login/2fa', twoFactorCodeLimiter, async (req, res) => {
  try {
    const decoded = verifyTwoFactorToken(req.body.twoFactorToken)
    if (!decoded) {
      return res.status(401).json(TWO_FACTOR_EXPIRED)
    }

    const User = await getUserModel()
    const user = await User.findById(decoded.userId)
    if (!user || !user.twoFactorEnabled || isTokenStale(decoded, user)) {
      return res.status(401).json(TWO_FACTOR_EXPIRED)
    }

    const check = await checkSecondFactor(User, user, req.body.code)
    if (!check.ok) {
      return res.status(401).json({ error: 'That code didn’t work. Try a new code from your app, or an unused recovery code.', reason: 'invalid' })
    }

    res.json(await startSession(user))
  } catch (error) {
    console.error('2FA login error:', error)
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
    if (!isSessionToken(decoded) || isTokenStale(decoded, user)) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        googleLinked: Boolean(user.googleId),
        apartmentCode: user.apartmentCode,
        apartmentName: user.apartmentName,
        twoFactorEnabled: user.twoFactorEnabled,
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

    if (email && !isEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }

    const passwordCheck = checkPassword(password, { username })
    if (!passwordCheck.ok) {
      return res.status(400).json({ error: 'Choose a stronger password', reasons: passwordCheck.reasons })
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
    if (user.email) await trySendVerificationEmail(user)

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      token,
      user: sessionUser(user)
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

// Add or change email: the new address starts unverified and gets a fresh link
router.put('/email', authenticateToken, verificationEmailLimiter, async (req, res) => {
  try {
    if (!isEmail(req.body.email)) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }
    const email = req.body.email.trim().toLowerCase()

    const User = await getUserModel()
    const user = await User.findById(req.user._id)

    if (user.email !== email) {
      user.email = email
      user.emailVerified = false
      await user.save()
      await trySendVerificationEmail(user)
    }

    res.json({
      success: true,
      user: { email: user.email, emailVerified: user.emailVerified }
    })
  } catch (error) {
    console.error('Update email error:', error)
    res.status(500).json({ error: 'Failed to update email' })
  }
})

// Resend the verification email
router.post('/send-verification', authenticateToken, verificationEmailLimiter, async (req, res) => {
  try {
    const User = await getUserModel()
    const user = await User.findById(req.user._id)

    if (!user.email) {
      return res.status(400).json({ error: 'Add an email address first' })
    }
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Your email is already verified' })
    }

    await sendVerificationEmail(user)
    res.json({ success: true, message: 'Verification email sent' })
  } catch (error) {
    console.error('Send verification error:', error)
    res.status(500).json({ error: 'Failed to send verification email' })
  }
})

const VERIFY_ERRORS = {
  invalid: 'This verification link is invalid or has already been used.',
  expired: 'This verification link has expired. Send a new one from Settings.'
}

// Verify email (public: the link may be opened on a device that isn't signed in)
router.post('/verify-email', async (req, res) => {
  try {
    const User = await getUserModel()
    const result = await verifyEmailToken(User, req.body.token)
    if (!result.ok) {
      return res.status(400).json({ error: VERIFY_ERRORS[result.reason], reason: result.reason })
    }

    res.json({ success: true, message: 'Email verified', email: result.user.email })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ error: 'Failed to verify email' })
  }
})

// Request a password reset. Always answers the same, so it can't be used to find accounts.
router.post('/request-password-reset', passwordResetRequestLimiter, async (req, res) => {
  const { identifier } = req.body
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ error: 'Enter your username or email' })
  }

  res.json({ success: true, message: 'If that account has a verified email, a reset link is on its way.' })

  // After responding, so response time doesn't show whether an account matched
  try {
    await requestPasswordReset(await getUserModel(), identifier)
  } catch (error) {
    console.error('Request password reset error:', error)
  }
})

const RESET_ERRORS = {
  invalid: 'This reset link is invalid or has already been used.',
  expired: 'This reset link has expired. Request a new one.'
}

// Set a new password from a reset link (public: the link may open on any device)
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const User = await getUserModel()
    const result = await resetPasswordWithToken(User, req.body.token, req.body.password)
    if (!result.ok && result.reason === 'weak') {
      return res.status(400).json({ error: 'Choose a stronger password', reason: result.reason, reasons: result.reasons })
    }
    if (!result.ok) {
      return res.status(400).json({ error: RESET_ERRORS[result.reason], reason: result.reason })
    }

    res.json({ success: true, message: 'Password updated. Sign in with your new password.' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Start turning on two-factor login: returns a secret and QR code to scan
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const User = await getUserModel()
    const user = await User.findById(req.user._id)
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: 'Two-factor login is already on' })
    }

    res.json({ success: true, ...(await startTwoFactorSetup(user)) })
  } catch (error) {
    console.error('2FA setup error:', error)
    res.status(500).json({ error: 'Failed to start two-factor setup' })
  }
})

const CONFIRM_2FA_ERRORS = {
  enabled: 'Two-factor login is already on',
  'no-setup': 'Start two-factor setup first',
  invalid: 'That code didn’t match. Check your authenticator app and try again.'
}

// Finish turning on two-factor login with a code from the app. Recovery codes are shown only here.
router.post('/2fa/confirm', authenticateToken, twoFactorCodeLimiter, async (req, res) => {
  try {
    const User = await getUserModel()
    const user = await User.findById(req.user._id)
    const result = await confirmTwoFactor(user, req.body.code)
    if (!result.ok) {
      return res.status(400).json({ error: CONFIRM_2FA_ERRORS[result.reason], reason: result.reason })
    }

    res.json({ success: true, recoveryCodes: result.recoveryCodes })
  } catch (error) {
    console.error('2FA confirm error:', error)
    res.status(500).json({ error: 'Failed to turn on two-factor login' })
  }
})

const DISABLE_2FA_ERRORS = {
  'not-enabled': 'Two-factor login is already off',
  invalid: 'That code didn’t work. Use a code from your app or an unused recovery code.'
}

// Turn two-factor login off, after a code from the app or a recovery code
router.post('/2fa/disable', authenticateToken, twoFactorCodeLimiter, async (req, res) => {
  try {
    const User = await getUserModel()
    const user = await User.findById(req.user._id)
    const result = await disableTwoFactor(User, user, req.body.code)
    if (!result.ok) {
      return res.status(400).json({ error: DISABLE_2FA_ERRORS[result.reason], reason: result.reason })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('2FA disable error:', error)
    res.status(500).json({ error: 'Failed to turn off two-factor login' })
  }
})

const GOOGLE_INTENTS = new Set(['signin', 'link'])

// A sign-in takes up to three calls, and a household may share one IP
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' }
})

const requireGoogle = (req, res, next) => {
  if (!isGoogleConfigured()) return res.status(503).json({ error: 'Sign in with Google isn’t set up on this server.' })
  next()
}

// Linking is for the signed-in roommate; signing in needs no session
const authenticateIfLinking = (intent, req, res, next) => intent === 'link' ? authenticateToken(req, res, next) : next()

// Google has checked its address, so a matching email counts as verified here too
const trustGoogleEmail = (user, identity) => {
  if (!identity.email || !identity.emailVerified || user.email !== identity.email) return
  user.emailVerified = true
  user.emailVerificationTokenHash = undefined
  user.emailVerificationExpires = undefined
}

// Start a round trip to Google: to sign in, or (signed in) to link Google to this account
router.post('/google/start', googleLimiter, requireGoogle, (req, res, next) => {
  if (!GOOGLE_INTENTS.has(req.body.intent)) return res.status(400).json({ error: 'Unknown Google sign-in intent' })
  authenticateIfLinking(req.body.intent, req, res, next)
}, (req, res) => {
  const state = createState({ intent: req.body.intent, userId: req.user?._id })
  res.json({ success: true, url: googleAuthUrl(state), state })
})

// Google sent the browser back with a code. Signs in a returning roommate, links Google
// for a signed-in one, or asks a newcomer to pick an apartment first.
router.post('/google/callback', googleLimiter, requireGoogle, (req, res, next) => {
  const state = readState(req.body.state)
  if (!state || !GOOGLE_INTENTS.has(state.intent)) {
    return res.status(400).json({ error: 'This Google sign-in has expired. Try again.' })
  }
  req.googleState = state
  authenticateIfLinking(state.intent, req, res, next)
}, async (req, res) => {
  try {
    const { intent, userId, nonce } = req.googleState
    if (typeof req.body.code !== 'string' || !req.body.code) {
      return res.status(400).json({ error: 'Google didn’t send a sign-in code. Try again.' })
    }

    let identity
    try {
      identity = await exchangeGoogleCode(req.body.code, nonce)
    } catch (error) {
      console.error('Google code exchange error:', error)
      return res.status(400).json({ error: 'Google sign-in failed. Try again.' })
    }

    const User = await getUserModel()
    const linkedUser = await User.findOne({ googleId: identity.sub })

    if (intent === 'link') {
      // The state was made for this account; a different signed-in account can't finish it
      if (String(req.user._id) !== userId) {
        return res.status(400).json({ error: 'This Google sign-in was started from another account.' })
      }
      if (linkedUser && !linkedUser._id.equals(req.user._id)) {
        return res.status(409).json({ error: 'That Google account is already linked to another roommate.' })
      }

      const user = await User.findById(req.user._id)
      if (user.googleId && user.googleId !== identity.sub) {
        return res.status(409).json({ error: 'A different Google account is already linked to you.' })
      }
      user.googleId = identity.sub
      if (!user.email && identity.emailVerified) user.email = identity.email
      trustGoogleEmail(user, identity)
      await user.save()
      return res.json({ success: true, status: 'linked', user: sessionUser(user) })
    }

    if (linkedUser) {
      trustGoogleEmail(linkedUser, identity)
      // Google stands in for the password, so 2FA still asks for a code at /login/2fa
      if (linkedUser.twoFactorEnabled) {
        await linkedUser.save()
        return res.json({
          success: true,
          status: 'two-factor',
          twoFactorRequired: true,
          twoFactorToken: generateTwoFactorToken(linkedUser._id, linkedUser.passwordChangedAt)
        })
      }
      return res.json({ ...(await startSession(linkedUser)), status: 'signed-in' })
    }

    // Rather than a second account, or a takeover, the owner of that address links Google themselves
    if (identity.email && await User.findOne({ email: identity.email, emailVerified: true })) {
      return res.status(409).json({ error: 'An account already uses this email. Sign in with your password, then link Google in Settings.' })
    }

    res.json({
      success: true,
      status: 'needs-apartment',
      signupToken: createSignupToken({ sub: identity.sub, email: identity.email, emailVerified: identity.emailVerified }),
      email: identity.email,
      name: identity.name
    })
  } catch (error) {
    console.error('Google callback error:', error)
    res.status(500).json({ error: 'Google sign-in failed' })
  }
})

// A newcomer from Google joins or starts an apartment; only now is the account made
router.post('/google/complete', googleLimiter, validateApartmentCode, async (req, res) => {
  try {
    const identity = readSignupToken(req.body.signupToken)
    if (!identity) {
      return res.status(400).json({ error: 'This Google sign-in has expired. Start again.' })
    }

    const { mode, apartmentCode } = req.body
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : ''
    const apartmentName = typeof req.body.apartmentName === 'string' ? req.body.apartmentName.trim() : ''
    if (mode !== 'join' && mode !== 'start') {
      return res.status(400).json({ error: 'Choose to join or start a home' })
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3–30 characters' })
    }
    if (mode === 'start' && (apartmentName.length < 2 || apartmentName.length > 50)) {
      return res.status(400).json({ error: 'Apartment name must be 2–50 characters' })
    }

    const User = await getUserModel()

    if (await User.findOne({ googleId: identity.sub })) {
      return res.status(409).json({ error: 'That Google account already has an account here. Sign in with Google.' })
    }
    if (await User.findOne({ username })) {
      return res.status(400).json({ error: 'Username already exists' })
    }

    let name = apartmentName
    if (mode === 'join') {
      name = await joinableApartmentName(User, apartmentCode)
      if (!name) return res.status(400).json({ error: INVALID_APARTMENT_CODE })
    } else if (await User.findOne({ apartmentCode })) {
      return res.status(400).json({ error: 'Apartment code already exists. Please choose a different code.' })
    }

    const user = new User({
      username,
      googleId: identity.sub,
      email: identity.email,
      emailVerified: Boolean(identity.email && identity.emailVerified),
      apartmentCode,
      apartmentName: name
    })
    await user.save()
    if (user.email && !user.emailVerified) await trySendVerificationEmail(user)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token: generateToken(user._id),
      user: sessionUser(user)
    })
  } catch (error) {
    // Two submits racing past the checks above hit the unique indexes
    if (error.code === 11000) {
      return res.status(409).json({ error: 'That account already exists. Try signing in with Google.' })
    }
    console.error('Google complete error:', error)
    res.status(500).json({ error: 'Failed to create your account' })
  }
})

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' })
})

export default router
