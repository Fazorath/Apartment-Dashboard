import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { outbox } from '../utils/mailer.js'
import { totpCode } from '../utils/totp.js'

const STRONG_PASSWORD = 'maple-street-kettle'
// AL420 is on the default allowlist; the other test files open it too, so joining it always works
const APARTMENT_CODE = 'AL420'
const SERVICES_ID = 'com.example.roommate.web'
const TEAM_ID = 'TEAM123456'
const KEY_ID = 'KEY1234567'
const REDIRECT_URI = 'https://api.example.com/api/auth/apple/return'

// A throwaway P-256 key standing in for the .p8 file downloaded from Apple
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const PRIVATE_KEY_PEM = privateKey.export({ type: 'pkcs8', format: 'pem' })

let appleUserCount = 0
const nextAppleAccount = (overrides = {}) => {
  const n = ++appleUserCount
  return { sub: `000123.apple-sub-${n}.4567`, email: `apple${n}@icloud.com`, email_verified: 'true', ...overrides }
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

// Like Apple, the ID token echoes the nonce from the consent URL the browser was sent to
let consentNonce

// Stands in for Apple's token endpoint: any code is exchanged for an ID token for `account`
const appleSignsInAs = (account, claims = {}) => {
  const fetch = vi.fn(async () => {
    const idToken = [
      base64url({ alg: 'RS256', kid: 'apple-key' }),
      base64url({ iss: 'https://appleid.apple.com', aud: SERVICES_ID, exp: Math.floor(Date.now() / 1000) + 3600, nonce: consentNonce, ...account, ...claims }),
      'signature'
    ].join('.')
    return new Response(JSON.stringify({ access_token: 'access', id_token: idToken }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const start = async (intent, token) => {
  const req = request(app).post('/api/auth/apple/start').send({ intent })
  const res = await (token ? req.set('Authorization', `Bearer ${token}`) : req)
  if (res.body.url) consentNonce = new URL(res.body.url).searchParams.get('nonce')
  return res
}
const callback = (body, token) => {
  const req = request(app).post('/api/auth/apple/callback').send(body)
  return token ? req.set('Authorization', `Bearer ${token}`) : req
}
const complete = (body) => request(app).post('/api/auth/apple/complete').send(body)
const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

// Runs the browser's round trip: start, consent at Apple, come back with a code
const signInWithApple = async (account, { intent = 'signin', token, claims } = {}) => {
  appleSignsInAs(account, claims)
  const started = await start(intent, token)
  expect(started.status).toBe(200)
  return callback({ code: 'auth-code', state: started.body.state }, token)
}

describe('sign in with Apple', () => {
  beforeAll(async () => {
    // Make sure the apartment exists whichever test file runs first
    await request(app).post('/api/auth/register').send({ username: 'applehost', password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE })
  })

  beforeEach(() => {
    vi.stubEnv('APPLE_CLIENT_ID', SERVICES_ID)
    vi.stubEnv('APPLE_TEAM_ID', TEAM_ID)
    vi.stubEnv('APPLE_KEY_ID', KEY_ID)
    vi.stubEnv('APPLE_PRIVATE_KEY', PRIVATE_KEY_PEM)
    vi.stubEnv('APPLE_REDIRECT_URI', REDIRECT_URI)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('asks a first-time Apple user for an apartment, then signs them in to it', async () => {
    const account = nextAppleAccount()
    const res = await signInWithApple(account)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'needs-apartment', email: account.email })
    expect(res.body).not.toHaveProperty('token')

    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'applejoiner', apartmentCode: APARTMENT_CODE.toLowerCase() })
    expect(joined.status).toBe(201)
    expect(joined.body.user).toMatchObject({
      username: 'applejoiner',
      email: account.email,
      emailVerified: true,
      appleLinked: true,
      googleLinked: false,
      apartmentCode: APARTMENT_CODE
    })

    const profile = await me(joined.body.token)
    expect(profile.status).toBe(200)
    expect(profile.body.user).toMatchObject({ username: 'applejoiner', apartmentCode: APARTMENT_CODE, emailVerified: true, appleLinked: true })
  })

  it('lets a first-time Apple user start a home, and signs them straight back in next time', async () => {
    const account = nextAppleAccount()
    const first = await signInWithApple(account)
    const started = await complete({ signupToken: first.body.signupToken, mode: 'start', username: 'applestarter', apartmentCode: 'APPL01', apartmentName: 'Apple House' })
    expect(started.status).toBe(201)
    expect(started.body.user).toMatchObject({ apartmentCode: 'APPL01', apartmentName: 'Apple House' })

    const again = await signInWithApple(account)
    expect(again.status).toBe(200)
    expect(again.body).toMatchObject({ status: 'signed-in', user: { username: 'applestarter', apartmentCode: 'APPL01', appleLinked: true } })
    expect((await me(again.body.token)).body.user).toMatchObject({ username: 'applestarter', appleLinked: true })
  })

  it('counts a private-relay address as verified', async () => {
    const relay = 'abc123xyz@privaterelay.appleid.com'
    const res = await signInWithApple(nextAppleAccount({ email: relay, is_private_email: 'true' }))
    expect(res.body).toMatchObject({ status: 'needs-apartment', email: relay })

    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'applerelay', apartmentCode: APARTMENT_CODE })
    expect(joined.body.user).toMatchObject({ email: relay, emailVerified: true })
    expect(outbox.some((m) => m.to === relay)).toBe(false)
  })

  it('accepts email_verified as a boolean, as Apple sometimes sends it', async () => {
    const res = await signInWithApple(nextAppleAccount({ email_verified: true }))
    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'appleboolean', apartmentCode: APARTMENT_CODE })
    expect(joined.body.user.emailVerified).toBe(true)
  })

  it('makes an account without an email when Apple shares none', async () => {
    const res = await signInWithApple({ sub: `000123.no-email-${++appleUserCount}.4567` })
    expect(res.body.status).toBe('needs-apartment')

    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'appleprivate', apartmentCode: APARTMENT_CODE })
    expect(joined.status).toBe(201)
    expect(joined.body.user).toMatchObject({ emailVerified: false, appleLinked: true })
  })

  it('does not make a second account when the same Apple sign-up is submitted twice', async () => {
    const res = await signInWithApple(nextAppleAccount())
    const body = { signupToken: res.body.signupToken, mode: 'join', apartmentCode: APARTMENT_CODE }

    expect((await complete({ ...body, username: 'appletwice' })).status).toBe(201)
    expect((await complete({ ...body, username: 'appletwice2' })).status).toBe(409)
  })

  it('rejects joining with a code nobody can join, and leaves no account behind', async () => {
    const account = nextAppleAccount()
    const res = await signInWithApple(account)

    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'applelost', apartmentCode: 'NOPE99' })
    expect(joined.status).toBe(400)

    expect((await signInWithApple(account)).body.status).toBe('needs-apartment')
  })

  it('sends the browser to Apple asking for the email, and has Apple post back to the server', async () => {
    appleSignsInAs(nextAppleAccount())
    const started = await start('signin')
    const authUrl = new URL(started.body.url)

    expect(authUrl.origin + authUrl.pathname).toBe('https://appleid.apple.com/auth/authorize')
    expect(authUrl.searchParams.get('client_id')).toBe(SERVICES_ID)
    expect(authUrl.searchParams.get('redirect_uri')).toBe(REDIRECT_URI)
    expect(authUrl.searchParams.get('response_type')).toBe('code')
    expect(authUrl.searchParams.get('scope')).toBe('name email')
    // Apple only releases the email to a form_post redirect
    expect(authUrl.searchParams.get('response_mode')).toBe('form_post')
    expect(authUrl.searchParams.get('state')).toBe(started.body.state)
    expect(authUrl.searchParams.has('client_secret')).toBe(false)
  })

  it('trades the code at Apple’s token endpoint with a client secret signed by the server’s key', async () => {
    const fetch = appleSignsInAs(nextAppleAccount())
    const started = await start('signin')

    await callback({ code: 'the-code', state: started.body.state })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://appleid.apple.com/auth/token')
    const sent = Object.fromEntries(new URLSearchParams(init.body.toString()))
    expect(sent).toMatchObject({ code: 'the-code', client_id: SERVICES_ID, grant_type: 'authorization_code', redirect_uri: REDIRECT_URI })

    const secret = jwt.verify(sent.client_secret, publicKey, { algorithms: ['ES256'], complete: true })
    expect(secret.header.kid).toBe(KEY_ID)
    expect(secret.payload).toMatchObject({ iss: TEAM_ID, sub: SERVICES_ID, aud: 'https://appleid.apple.com' })
    expect(secret.payload.exp - secret.payload.iat).toBeLessThanOrEqual(15777000) // Apple's six-month cap
  })

  it('reads a private key kept on one line with escaped newlines, as env files often store it', async () => {
    vi.stubEnv('APPLE_PRIVATE_KEY', PRIVATE_KEY_PEM.trim().replace(/\n/g, '\\n'))
    const res = await signInWithApple(nextAppleAccount())
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('needs-apartment')
  })

  it('says Apple sign-in is unavailable when it is not configured', async () => {
    vi.stubEnv('APPLE_CLIENT_ID', '')
    expect((await start('signin')).status).toBe(503)

    vi.stubEnv('APPLE_CLIENT_ID', SERVICES_ID)
    vi.stubEnv('APPLE_PRIVATE_KEY', '')
    expect((await start('signin')).status).toBe(503)
  })

  it('fails without making an account when Apple refuses the code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })))
    const started = await start('signin')

    const res = await callback({ code: 'used-code', state: started.body.state })
    expect(res.status).toBe(400)
    expect(res.body).not.toHaveProperty('signupToken')
  })

  it.each([
    ['issued to another app', { aud: 'someone.elses.services.id' }],
    ['from another issuer', { iss: 'https://evil.example.com' }],
    ['expired', { exp: Math.floor(Date.now() / 1000) - 60 }],
    ['minted for a different sign-in attempt', { nonce: 'from-another-attempt' }]
  ])('rejects an ID token %s', async (_, claims) => {
    appleSignsInAs(nextAppleAccount(), claims)
    const started = await start('signin')
    expect((await callback({ code: 'auth-code', state: started.body.state })).status).toBe(400)
  })

  it('sends a newcomer whose email already has an account to sign in and link instead', async () => {
    await request(app).post('/api/auth/register').send({ username: 'appleemailowner', password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE, email: 'appleowner@example.com' })
    const token = outbox.filter((m) => m.to === 'appleowner@example.com').at(-1).text.match(/verify-email\?token=([A-Za-z0-9_-]+)/)[1]
    await request(app).post('/api/auth/verify-email').send({ token })

    const res = await signInWithApple(nextAppleAccount({ email: 'appleowner@example.com' }))
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/link/i)
    expect(res.body).not.toHaveProperty('signupToken')
  })

  it('rejects a state the server did not issue, a forged sign-up token, and a state meant for Google', async () => {
    appleSignsInAs(nextAppleAccount())
    expect((await callback({ code: 'auth-code', state: 'made-up' })).status).toBe(400)
    expect((await complete({ signupToken: 'made-up', mode: 'join', username: 'appleforger', apartmentCode: APARTMENT_CODE })).status).toBe(400)

    const googleState = jwt.sign({ purpose: 'google-state', intent: 'signin', nonce: 'n' }, process.env.JWT_SECRET || 'fallback-secret')
    expect((await callback({ code: 'auth-code', state: googleState })).status).toBe(400)
    const googleSignup = jwt.sign({ purpose: 'google-signup', sub: 'x' }, process.env.JWT_SECRET || 'fallback-secret')
    expect((await complete({ signupToken: googleSignup, mode: 'join', username: 'crossover', apartmentCode: APARTMENT_CODE })).status).toBe(400)
  })

  it('turns away a password login for an account made with Apple', async () => {
    const res = await signInWithApple(nextAppleAccount())
    await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'appleonly', apartmentCode: APARTMENT_CODE })

    const login = await request(app).post('/api/auth/login').send({ username: 'appleonly', password: STRONG_PASSWORD })
    expect(login.status).toBe(401)
  })

  describe('the redirect Apple posts back to', () => {
    it('hands the code and state on to the frontend callback page', async () => {
      const res = await request(app).post('/api/auth/apple/return').type('form').send({ code: 'c0de', state: 'st4te' })

      expect(res.status).toBe(303)
      const location = new URL(res.headers.location)
      expect(location.origin + location.pathname).toBe('http://localhost:5173/auth/apple/callback')
      expect(location.searchParams.get('code')).toBe('c0de')
      expect(location.searchParams.get('state')).toBe('st4te')
    })

    it('hands an error on, such as the roommate cancelling', async () => {
      const res = await request(app).post('/api/auth/apple/return').type('form').send({ error: 'user_cancelled_authorize', state: 'st4te' })

      expect(res.status).toBe(303)
      expect(new URL(res.headers.location).searchParams.get('error')).toBe('user_cancelled_authorize')
    })

    it('does not carry anything else Apple (or anyone) posts', async () => {
      const res = await request(app).post('/api/auth/apple/return').type('form').send({ code: 'c0de', state: 'st4te', user: '{"email":"a@b.c"}', evil: 'x' })

      const params = new URL(res.headers.location).searchParams
      expect([...params.keys()].sort()).toEqual(['code', 'state'])
    })
  })

  describe('linking', () => {
    const registerWithPassword = async (username, email) => {
      const res = await request(app).post('/api/auth/register').send({ username, password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE, email })
      expect(res.status).toBe(201)
      return res.body.token
    }
    const passwordLogin = (username) => request(app).post('/api/auth/login').send({ username, password: STRONG_PASSWORD })

    it('still asks for a 2FA code when signing in with Apple', async () => {
      const token = await registerWithPassword('appletwofactor')
      const account = nextAppleAccount()
      expect((await signInWithApple(account, { intent: 'link', token })).status).toBe(200)

      const auth = (req) => req.set('Authorization', `Bearer ${token}`)
      const { secret } = (await auth(request(app).post('/api/auth/2fa/setup'))).body
      expect((await auth(request(app).post('/api/auth/2fa/confirm')).send({ code: totpCode(secret) })).status).toBe(200)

      const res = await signInWithApple(account)
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ status: 'two-factor', twoFactorRequired: true })
      expect(res.body.token).toBeUndefined()
      expect((await me(res.body.twoFactorToken)).status).toBe(401)

      const done = await request(app).post('/api/auth/login/2fa')
        .send({ twoFactorToken: res.body.twoFactorToken, code: totpCode(secret, Date.now() + 30 * 1000) })
      expect(done.status).toBe(200)
      expect((await me(done.body.token)).body.user.username).toBe('appletwofactor')
    })

    it('links Apple to an existing account, so either sign-in method reaches it', async () => {
      const token = await registerWithPassword('applelinker', 'applelinker@icloud.com')
      const account = nextAppleAccount({ email: 'applelinker@icloud.com' })

      const linked = await signInWithApple(account, { intent: 'link', token })
      expect(linked.status).toBe(200)
      expect(linked.body).toMatchObject({ status: 'linked', user: { username: 'applelinker', appleLinked: true, emailVerified: true } })

      const viaApple = await signInWithApple(account)
      expect(viaApple.body).toMatchObject({ status: 'signed-in', user: { username: 'applelinker' } })

      const viaPassword = await passwordLogin('applelinker')
      expect(viaPassword.status).toBe(200)
      expect(viaPassword.body.user).toMatchObject({ username: 'applelinker', appleLinked: true })
      expect(viaPassword.body.user.id).toBe(viaApple.body.user.id)
    })

    it('fills in a missing email from Apple, verified', async () => {
      const token = await registerWithPassword('applelinknoemail')
      const account = nextAppleAccount()

      await signInWithApple(account, { intent: 'link', token })
      expect((await me(token)).body.user).toMatchObject({ email: account.email, emailVerified: true, appleLinked: true })
    })

    it('leaves a different, unverified email unverified', async () => {
      const token = await registerWithPassword('applelinkother', 'apple.someone.else@example.com')

      await signInWithApple(nextAppleAccount(), { intent: 'link', token })
      expect((await me(token)).body.user).toMatchObject({ email: 'apple.someone.else@example.com', emailVerified: false, appleLinked: true })
    })

    it('refuses to swap in a different Apple account once one is linked', async () => {
      const token = await registerWithPassword('applelinkedonce')
      const first = nextAppleAccount()
      await signInWithApple(first, { intent: 'link', token })

      expect((await signInWithApple(nextAppleAccount(), { intent: 'link', token })).status).toBe(409)
      expect((await signInWithApple(first)).body).toMatchObject({ status: 'signed-in', user: { username: 'applelinkedonce' } })
    })

    it('refuses to link an Apple account that already belongs to another roommate', async () => {
      const account = nextAppleAccount()
      const first = await signInWithApple(account)
      await complete({ signupToken: first.body.signupToken, mode: 'join', username: 'appleowner', apartmentCode: APARTMENT_CODE })

      const token = await registerWithPassword('applethief')
      const res = await signInWithApple(account, { intent: 'link', token })
      expect(res.status).toBe(409)
      expect((await me(token)).body.user.appleLinked).toBe(false)
    })

    it('requires sign-in to link, and only finishes for the account that started it', async () => {
      appleSignsInAs(nextAppleAccount())
      expect((await start('link')).status).toBe(401)

      const starter = await registerWithPassword('applelinkstarter')
      const other = await registerWithPassword('applelinkfinisher')
      const started = await start('link', starter)

      expect((await callback({ code: 'auth-code', state: started.body.state })).status).toBe(401)
      expect((await callback({ code: 'auth-code', state: started.body.state }, other)).status).toBe(400)
      expect((await me(other)).body.user.appleLinked).toBe(false)
    })

    it('keeps Apple and Google as separate links on one account', async () => {
      const token = await registerWithPassword('bothlinked')
      const account = nextAppleAccount()
      await signInWithApple(account, { intent: 'link', token })

      const profile = (await me(token)).body.user
      expect(profile).toMatchObject({ appleLinked: true, googleLinked: false })
    })
  })
})
