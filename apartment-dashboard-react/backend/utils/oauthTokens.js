import crypto from 'crypto'
import jwt from 'jsonwebtoken'

/**
 * The signed, short-lived tokens every social sign-in provider shares. Each is stamped
 * with the provider's name, so one provider's state or sign-up token can't be replayed
 * against another's routes.
 */

const STATE_TTL = '10m'
const SIGNUP_TTL = '15m'

const secret = () => process.env.JWT_SECRET || 'fallback-secret'

/**
 * A state for one round trip to the provider. `userId` is set when a signed-in roommate
 * is linking, so the callback can't attach the provider to anyone else. Its nonce goes to
 * the provider and must come back in the ID token, tying the token to this trip.
 * Returns `{ state, nonce }`.
 */
export const createState = (provider, { intent, userId }) => {
  const nonce = crypto.randomBytes(16).toString('base64url')
  const state = jwt.sign(
    { purpose: `${provider}-state`, intent, uid: userId ? String(userId) : undefined, nonce },
    secret(),
    { expiresIn: STATE_TTL }
  )
  return { state, nonce }
}

// Returns `{ intent, userId, nonce }`, or null when the state is forged, expired or for something else
export const readState = (provider, state) => {
  try {
    const decoded = jwt.verify(String(state), secret())
    if (decoded.purpose !== `${provider}-state`) return null
    return { intent: decoded.intent, userId: decoded.uid, nonce: decoded.nonce }
  } catch {
    return null
  }
}

// Carries an identity from the callback to the join/create step, so the
// account is only made once the roommate has picked an apartment
export const createSignupToken = (provider, identity) => jwt.sign({ purpose: `${provider}-signup`, ...identity }, secret(), { expiresIn: SIGNUP_TTL })

export const readSignupToken = (provider, token) => {
  try {
    const decoded = jwt.verify(String(token), secret())
    if (decoded.purpose !== `${provider}-signup`) return null
    return { sub: decoded.sub, email: decoded.email, emailVerified: decoded.emailVerified }
  } catch {
    return null
  }
}

/**
 * Decode and check the claims of an ID token that came straight from the provider's token
 * endpoint over TLS in exchange for our secret, so its signature needn't be checked
 * (OpenID Connect Core 3.1.3.7). Throws if the token isn't for this client and this trip.
 */
export const readIdTokenClaims = (idToken, { label, issuers, clientId, nonce }) => {
  let claims
  try {
    claims = JSON.parse(Buffer.from(String(idToken).split('.')[1] ?? '', 'base64url').toString())
  } catch {
    throw new Error(`${label} ID token is unreadable`)
  }
  if (!issuers.includes(claims.iss)) throw new Error(`${label} ID token has the wrong issuer`)
  if (claims.aud !== clientId) throw new Error(`${label} ID token is for another client`)
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error(`${label} ID token has expired`)
  if (!claims.sub) throw new Error(`${label} ID token has no subject`)
  if (!nonce || claims.nonce !== nonce) throw new Error(`${label} ID token is from another sign-in attempt`)
  return claims
}
