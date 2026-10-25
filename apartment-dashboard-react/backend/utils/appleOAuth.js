import jwt from 'jsonwebtoken'
import { frontendLink } from './emailLinks.js'
import { readIdTokenClaims } from './oauthTokens.js'

/**
 * Sign in with Apple through the server-side authorization-code flow. It follows Google's
 * (see googleOAuth.js), with three differences:
 * - Apple only releases the email to a `form_post` redirect, so Apple POSTs the browser to
 *   the API's `/apple/return` (`appleReturn`), which bounces it on to the frontend's
 *   /auth/apple/callback page with the code in the query string
 * - the "client secret" is a short-lived ES256 JWT signed with the key downloaded from
 *   Apple (a .p8 file), made fresh for each exchange
 * - Apple sends the roommate's name once, to the browser, which this app doesn't use
 */

const AUTH_ENDPOINT = 'https://appleid.apple.com/auth/authorize'
const TOKEN_ENDPOINT = 'https://appleid.apple.com/auth/token'
const APPLE_ISSUER = 'https://appleid.apple.com'

// APPLE_CLIENT_ID is the Services ID (not the app's bundle ID)
export const isAppleConfigured = () => Boolean(
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY &&
  process.env.APPLE_REDIRECT_URI
)

// Env files and hosts keep multi-line values on one line, with the newlines written as \n
const privateKey = () => process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n')

const clientSecret = () => jwt.sign({}, privateKey(), {
  algorithm: 'ES256',
  keyid: process.env.APPLE_KEY_ID,
  issuer: process.env.APPLE_TEAM_ID,
  subject: process.env.APPLE_CLIENT_ID,
  audience: APPLE_ISSUER,
  expiresIn: '5m'
})

export const appleAuthUrl = (state, nonce) => {
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID,
    redirect_uri: process.env.APPLE_REDIRECT_URI,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce
  })
  return `${AUTH_ENDPOINT}?${params}`
}

/**
 * Trade an authorization code for the Apple account behind it:
 * `{ sub, email, emailVerified }`. Throws if Apple refuses the code, or the ID token
 * wasn't issued for the round trip whose state carried `nonce`.
 */
export const exchangeAppleCode = async (code, nonce) => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID,
      client_secret: clientSecret(),
      redirect_uri: process.env.APPLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  })
  if (!response.ok) throw new Error(`Apple token exchange failed (${response.status})`)

  const { id_token: idToken } = await response.json()
  const claims = readIdTokenClaims(idToken, {
    label: 'Apple',
    issuers: [APPLE_ISSUER],
    clientId: process.env.APPLE_CLIENT_ID,
    nonce
  })

  const isTrue = (claim) => claim === true || claim === 'true'
  return {
    sub: String(claims.sub),
    email: claims.email ? String(claims.email).toLowerCase() : undefined,
    // Apple's private-relay addresses (is_private_email) forward to the roommate's real inbox, so they count
    emailVerified: isTrue(claims.email_verified) || isTrue(claims.is_private_email)
  }
}

// Only these survive the hop, so whatever else is posted to the endpoint goes no further
const RETURN_FIELDS = ['code', 'state', 'error']

/**
 * Apple POSTs the browser here after consent. The frontend can't receive a POST, so send
 * the browser on to its callback page. Mounted ahead of CORS in app.js: the post comes from
 * appleid.apple.com's own page, not from one of this app's origins.
 */
export const appleReturn = (req, res) => {
  const params = new URLSearchParams()
  for (const field of RETURN_FIELDS) {
    const value = req.body?.[field]
    if (typeof value === 'string' && value) params.set(field, value.slice(0, 4096))
  }
  res.redirect(303, `${frontendLink('/auth/apple/callback')}?${params}`)
}

export const apple = {
  name: 'apple',
  label: 'Apple',
  idField: 'appleId',
  isConfigured: isAppleConfigured,
  authUrl: appleAuthUrl,
  exchangeCode: exchangeAppleCode
}
