import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { frontendLink } from './emailLinks.js'

/**
 * Google sign-in through the server-side authorization-code flow:
 * - the frontend sends the browser to `googleAuthUrl(state)`
 * - Google returns it to the frontend's /auth/google/callback with a code
 * - the frontend posts the code here, and `exchangeGoogleCode` trades it (with the
 *   client secret, which never leaves the server) for the account's identity
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])

const STATE_TTL = '10m'
const SIGNUP_TTL = '15m'

const secret = () => process.env.JWT_SECRET || 'fallback-secret'

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

const redirectUri = () => process.env.GOOGLE_REDIRECT_URI || frontendLink('/auth/google/callback')

/**
 * A signed, short-lived state for one round trip to Google. `userId` is set when a
 * signed-in roommate is linking, so the callback can't attach Google to anyone else.
 * Its nonce goes to Google and must come back in the ID token, tying the token to this trip.
 */
export const createState = ({ intent, userId }) => jwt.sign(
  { purpose: 'google-state', intent, uid: userId ? String(userId) : undefined, nonce: crypto.randomBytes(16).toString('base64url') },
  secret(),
  { expiresIn: STATE_TTL }
)

// Returns `{ intent, userId, nonce }`, or null when the state is forged, expired or for something else
export const readState = (state) => {
  try {
    const decoded = jwt.verify(String(state), secret())
    if (decoded.purpose !== 'google-state') return null
    return { intent: decoded.intent, userId: decoded.uid, nonce: decoded.nonce }
  } catch {
    return null
  }
}

export const googleAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce: readState(state).nonce,
    prompt: 'select_account'
  })
  return `${AUTH_ENDPOINT}?${params}`
}

/**
 * Trade an authorization code for the Google account behind it:
 * `{ sub, email, emailVerified, name }`. Throws if Google refuses the code, or the
 * ID token wasn't issued for the round trip whose state carried `nonce`.
 */
export const exchangeGoogleCode = async (code, nonce) => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code'
    })
  })
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`)

  // The ID token came straight from Google over TLS in exchange for our secret, so its
  // signature needn't be checked (OpenID Connect Core 3.1.3.7); the claims still are
  const { id_token: idToken } = await response.json()
  const claims = JSON.parse(Buffer.from(String(idToken).split('.')[1] ?? '', 'base64url').toString())
  if (!GOOGLE_ISSUERS.has(claims.iss)) throw new Error('Google ID token has the wrong issuer')
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Google ID token is for another client')
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error('Google ID token has expired')
  if (!claims.sub) throw new Error('Google ID token has no subject')
  if (!nonce || claims.nonce !== nonce) throw new Error('Google ID token is from another sign-in attempt')

  return {
    sub: String(claims.sub),
    email: claims.email ? String(claims.email).toLowerCase() : undefined,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: claims.name
  }
}

// Carries a Google identity from the callback to the join/create step, so the
// account is only made once the roommate has picked an apartment
export const createSignupToken = (identity) => jwt.sign({ purpose: 'google-signup', ...identity }, secret(), { expiresIn: SIGNUP_TTL })

export const readSignupToken = (token) => {
  try {
    const decoded = jwt.verify(String(token), secret())
    if (decoded.purpose !== 'google-signup') return null
    return { sub: decoded.sub, email: decoded.email, emailVerified: decoded.emailVerified }
  } catch {
    return null
  }
}
