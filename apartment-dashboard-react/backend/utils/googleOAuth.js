import { frontendLink } from './emailLinks.js'
import { readIdTokenClaims } from './oauthTokens.js'

/**
 * Google sign-in through the server-side authorization-code flow:
 * - the frontend sends the browser to `googleAuthUrl(state, nonce)`
 * - Google returns it to the frontend's /auth/google/callback with a code
 * - the frontend posts the code here, and `exchangeGoogleCode` trades it (with the
 *   client secret, which never leaves the server) for the account's identity
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

const redirectUri = () => process.env.GOOGLE_REDIRECT_URI || frontendLink('/auth/google/callback')

export const googleAuthUrl = (state, nonce) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
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

  const { id_token: idToken } = await response.json()
  const claims = readIdTokenClaims(idToken, {
    label: 'Google',
    issuers: GOOGLE_ISSUERS,
    clientId: process.env.GOOGLE_CLIENT_ID,
    nonce
  })

  return {
    sub: String(claims.sub),
    email: claims.email ? String(claims.email).toLowerCase() : undefined,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: claims.name
  }
}

export const google = {
  name: 'google',
  label: 'Google',
  idField: 'googleId',
  isConfigured: isGoogleConfigured,
  authUrl: googleAuthUrl,
  exchangeCode: exchangeGoogleCode
}
