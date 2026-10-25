import rateLimit from 'express-rate-limit'
import { getUserModel } from '../models/User.js'
import { authenticateToken, generateToken, validateApartmentCode } from '../middleware/auth.js'
import { INVALID_APARTMENT_CODE, joinableApartmentName } from '../utils/apartments.js'
import { createSignupToken, createState, readSignupToken, readState } from '../utils/oauthTokens.js'

const INTENTS = new Set(['signin', 'link'])

// Linking is for the signed-in roommate; signing in needs no session
const authenticateIfLinking = (intent, req, res, next) => intent === 'link' ? authenticateToken(req, res, next) : next()

/**
 * Adds a provider's `/<name>/start`, `/callback` and `/complete` routes to the auth router.
 * `provider` is `{ name, label, idField, isConfigured, authUrl, exchangeCode }` (see
 * googleOAuth.js); `idField` is the User field that holds the provider's account id.
 * `helpers` are the auth router's own `sessionUser` and `trySendVerificationEmail`.
 */
export default function mountSocialSignIn(router, provider, { sessionUser, trySendVerificationEmail }) {
  const { name, label, idField } = provider
  const path = (route) => `/${name}${route}`

  // A sign-in takes up to three calls, and a household may share one IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again in a few minutes.' }
  })

  const requireConfigured = (req, res, next) => {
    if (!provider.isConfigured()) return res.status(503).json({ error: `Sign in with ${label} isn’t set up on this server.` })
    next()
  }

  // The provider has checked its address, so a matching email counts as verified here too
  const trustProviderEmail = (user, identity) => {
    if (!identity.email || !identity.emailVerified || user.email !== identity.email) return
    user.emailVerified = true
    user.emailVerificationTokenHash = undefined
    user.emailVerificationExpires = undefined
  }

  // Start a round trip to the provider: to sign in, or (signed in) to link it to this account
  router.post(path('/start'), limiter, requireConfigured, (req, res, next) => {
    if (!INTENTS.has(req.body.intent)) return res.status(400).json({ error: `Unknown ${label} sign-in intent` })
    authenticateIfLinking(req.body.intent, req, res, next)
  }, (req, res) => {
    const { state, nonce } = createState(name, { intent: req.body.intent, userId: req.user?._id })
    res.json({ success: true, url: provider.authUrl(state, nonce), state })
  })

  // The provider sent the browser back with a code. Signs in a returning roommate, links the
  // provider for a signed-in one, or asks a newcomer to pick an apartment first.
  router.post(path('/callback'), limiter, requireConfigured, (req, res, next) => {
    const state = readState(name, req.body.state)
    if (!state || !INTENTS.has(state.intent)) {
      return res.status(400).json({ error: `This ${label} sign-in has expired. Try again.` })
    }
    req.socialState = state
    authenticateIfLinking(state.intent, req, res, next)
  }, async (req, res) => {
    try {
      const { intent, userId, nonce } = req.socialState
      if (typeof req.body.code !== 'string' || !req.body.code) {
        return res.status(400).json({ error: `${label} didn’t send a sign-in code. Try again.` })
      }

      let identity
      try {
        identity = await provider.exchangeCode(req.body.code, nonce)
      } catch (error) {
        console.error(`${label} code exchange error:`, error)
        return res.status(400).json({ error: `${label} sign-in failed. Try again.` })
      }

      const User = await getUserModel()
      const linkedUser = await User.findOne({ [idField]: identity.sub })

      if (intent === 'link') {
        // The state was made for this account; a different signed-in account can't finish it
        if (String(req.user._id) !== userId) {
          return res.status(400).json({ error: `This ${label} sign-in was started from another account.` })
        }
        if (linkedUser && !linkedUser._id.equals(req.user._id)) {
          return res.status(409).json({ error: `That ${label} account is already linked to another roommate.` })
        }

        const user = await User.findById(req.user._id)
        if (user[idField] && user[idField] !== identity.sub) {
          return res.status(409).json({ error: `A different ${label} account is already linked to you.` })
        }
        user[idField] = identity.sub
        if (!user.email && identity.emailVerified) user.email = identity.email
        trustProviderEmail(user, identity)
        await user.save()
        return res.json({ success: true, status: 'linked', user: sessionUser(user) })
      }

      if (linkedUser) {
        trustProviderEmail(linkedUser, identity)
        linkedUser.lastLogin = new Date()
        await linkedUser.save()
        return res.json({
          success: true,
          status: 'signed-in',
          token: generateToken(linkedUser._id, linkedUser.passwordChangedAt),
          user: sessionUser(linkedUser)
        })
      }

      // Rather than a second account, or a takeover, the owner of that address links the provider themselves
      if (identity.email && await User.findOne({ email: identity.email, emailVerified: true })) {
        return res.status(409).json({ error: `An account already uses this email. Sign in with your password, then link ${label} in Settings.` })
      }

      res.json({
        success: true,
        status: 'needs-apartment',
        signupToken: createSignupToken(name, { sub: identity.sub, email: identity.email, emailVerified: identity.emailVerified }),
        email: identity.email,
        name: identity.name
      })
    } catch (error) {
      console.error(`${label} callback error:`, error)
      res.status(500).json({ error: `${label} sign-in failed` })
    }
  })

  // A newcomer joins or starts an apartment; only now is the account made
  router.post(path('/complete'), limiter, validateApartmentCode, async (req, res) => {
    try {
      const identity = readSignupToken(name, req.body.signupToken)
      if (!identity) {
        return res.status(400).json({ error: `This ${label} sign-in has expired. Start again.` })
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

      if (await User.findOne({ [idField]: identity.sub })) {
        return res.status(409).json({ error: `That ${label} account already has an account here. Sign in with ${label}.` })
      }
      if (await User.findOne({ username })) {
        return res.status(400).json({ error: 'Username already exists' })
      }

      let apartment = apartmentName
      if (mode === 'join') {
        apartment = await joinableApartmentName(User, apartmentCode)
        if (!apartment) return res.status(400).json({ error: INVALID_APARTMENT_CODE })
      } else if (await User.findOne({ apartmentCode })) {
        return res.status(400).json({ error: 'Apartment code already exists. Please choose a different code.' })
      }

      const user = new User({
        username,
        [idField]: identity.sub,
        email: identity.email,
        emailVerified: Boolean(identity.email && identity.emailVerified),
        apartmentCode,
        apartmentName: apartment
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
        return res.status(409).json({ error: `That account already exists. Try signing in with ${label}.` })
      }
      console.error(`${label} complete error:`, error)
      res.status(500).json({ error: 'Failed to create your account' })
    }
  })
}
