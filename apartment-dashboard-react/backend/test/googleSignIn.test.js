import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'

const STRONG_PASSWORD = 'maple-street-kettle'
// AL420 is on the default allowlist; the other test files open it too, so joining it always works
const APARTMENT_CODE = 'AL420'
const CLIENT_ID = 'test-client.apps.googleusercontent.com'

let googleUserCount = 0
const nextGoogleAccount = (overrides = {}) => {
  const n = ++googleUserCount
  return { sub: `google-sub-${n}`, email: `google${n}@gmail.com`, email_verified: true, ...overrides }
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

// Stands in for Google's token endpoint: any code is exchanged for an ID token for `account`
const googleSignsInAs = (account) => {
  const idToken = [
    base64url({ alg: 'RS256', typ: 'JWT' }),
    base64url({ iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 3600, ...account }),
    'signature'
  ].join('.')
  const fetch = vi.fn(async () => new Response(JSON.stringify({ access_token: 'access', id_token: idToken }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const start = (intent, token) => {
  const req = request(app).post('/api/auth/google/start').send({ intent })
  return token ? req.set('Authorization', `Bearer ${token}`) : req
}
const callback = (body, token) => {
  const req = request(app).post('/api/auth/google/callback').send(body)
  return token ? req.set('Authorization', `Bearer ${token}`) : req
}
const complete = (body) => request(app).post('/api/auth/google/complete').send(body)
const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

// Runs the browser's round trip: start, consent at Google, come back with a code
const signInWithGoogle = async (account, { intent = 'signin', token } = {}) => {
  googleSignsInAs(account)
  const started = await start(intent, token)
  expect(started.status).toBe(200)
  return callback({ code: 'auth-code', state: started.body.state }, token)
}

describe('sign in with Google', () => {
  beforeAll(async () => {
    // Make sure the apartment exists whichever test file runs first
    await request(app).post('/api/auth/register').send({ username: 'googlehost', password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE })
  })

  beforeEach(() => {
    vi.stubEnv('GOOGLE_CLIENT_ID', CLIENT_ID)
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('asks a first-time Google user for an apartment, then signs them in to it', async () => {
    const account = nextGoogleAccount()
    const res = await signInWithGoogle(account)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'needs-apartment', email: account.email })
    expect(res.body).not.toHaveProperty('token')

    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'googlejoiner', apartmentCode: APARTMENT_CODE.toLowerCase() })
    expect(joined.status).toBe(201)
    expect(joined.body.user).toMatchObject({
      username: 'googlejoiner',
      email: account.email,
      emailVerified: true,
      googleLinked: true,
      apartmentCode: APARTMENT_CODE
    })

    const profile = await me(joined.body.token)
    expect(profile.status).toBe(200)
    expect(profile.body.user).toMatchObject({ username: 'googlejoiner', apartmentCode: APARTMENT_CODE, emailVerified: true })
  })

  it('lets a first-time Google user start a home, and signs them straight back in next time', async () => {
    const account = nextGoogleAccount()
    const first = await signInWithGoogle(account)
    const started = await complete({ signupToken: first.body.signupToken, mode: 'start', username: 'googlestarter', apartmentCode: 'GOOG01', apartmentName: 'Google House' })
    expect(started.status).toBe(201)
    expect(started.body.user).toMatchObject({ apartmentCode: 'GOOG01', apartmentName: 'Google House' })

    const again = await signInWithGoogle(account)
    expect(again.status).toBe(200)
    expect(again.body).toMatchObject({ status: 'signed-in', user: { username: 'googlestarter', apartmentCode: 'GOOG01', googleLinked: true } })
    expect((await me(again.body.token)).body.user).toMatchObject({ username: 'googlestarter', googleLinked: true })
  })

  it('does not make a second account when the same Google sign-up is submitted twice', async () => {
    const res = await signInWithGoogle(nextGoogleAccount())
    const body = { signupToken: res.body.signupToken, mode: 'join', apartmentCode: APARTMENT_CODE }

    expect((await complete({ ...body, username: 'googletwice' })).status).toBe(201)
    expect((await complete({ ...body, username: 'googletwice2' })).status).toBe(409)
  })

  it('rejects joining with a code nobody can join, and leaves no account behind', async () => {
    const account = nextGoogleAccount()
    const res = await signInWithGoogle(account)

    const joined = await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'googlelost', apartmentCode: 'NOPE99' })
    expect(joined.status).toBe(400)

    expect((await signInWithGoogle(account)).body.status).toBe('needs-apartment')
  })

  it('trades the code at Google’s token endpoint with the server’s client secret', async () => {
    const fetch = googleSignsInAs(nextGoogleAccount())
    const started = await start('signin')
    const authUrl = new URL(started.body.url)
    expect(authUrl.origin).toBe('https://accounts.google.com')
    expect(authUrl.searchParams.get('client_id')).toBe(CLIENT_ID)
    expect(authUrl.searchParams.get('state')).toBe(started.body.state)
    expect(authUrl.searchParams.has('client_secret')).toBe(false)

    await callback({ code: 'the-code', state: started.body.state })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    const sent = new URLSearchParams(init.body.toString())
    expect(Object.fromEntries(sent)).toMatchObject({
      code: 'the-code',
      client_id: CLIENT_ID,
      client_secret: 'test-secret',
      grant_type: 'authorization_code',
      redirect_uri: authUrl.searchParams.get('redirect_uri')
    })
  })

  it('says Google sign-in is unavailable when no client is configured', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '')
    expect((await start('signin')).status).toBe(503)
  })

  it('fails without making an account when Google refuses the code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })))
    const started = await start('signin')

    const res = await callback({ code: 'used-code', state: started.body.state })
    expect(res.status).toBe(400)
    expect(res.body).not.toHaveProperty('signupToken')
  })

  it('rejects an ID token issued to another app', async () => {
    googleSignsInAs(nextGoogleAccount({ aud: 'someone-elses-client' }))
    const started = await start('signin')
    expect((await callback({ code: 'auth-code', state: started.body.state })).status).toBe(400)
  })

  it('rejects a state the server did not issue, and a forged sign-up token', async () => {
    googleSignsInAs(nextGoogleAccount())
    expect((await callback({ code: 'auth-code', state: 'made-up' })).status).toBe(400)
    expect((await complete({ signupToken: 'made-up', mode: 'join', username: 'forger', apartmentCode: APARTMENT_CODE })).status).toBe(400)
  })

  it('turns away a password login for an account made with Google', async () => {
    const res = await signInWithGoogle(nextGoogleAccount())
    await complete({ signupToken: res.body.signupToken, mode: 'join', username: 'googleonly', apartmentCode: APARTMENT_CODE })

    const login = await request(app).post('/api/auth/login').send({ username: 'googleonly', password: STRONG_PASSWORD })
    expect(login.status).toBe(401)
  })

  describe('linking', () => {
    const registerWithPassword = async (username, email) => {
      const res = await request(app).post('/api/auth/register').send({ username, password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE, email })
      expect(res.status).toBe(201)
      return res.body.token
    }
    const passwordLogin = (username) => request(app).post('/api/auth/login').send({ username, password: STRONG_PASSWORD })

    it('links Google to an existing account, so either sign-in method reaches it', async () => {
      const token = await registerWithPassword('linker', 'linker@gmail.com')
      const account = nextGoogleAccount({ email: 'linker@gmail.com' })

      const linked = await signInWithGoogle(account, { intent: 'link', token })
      expect(linked.status).toBe(200)
      expect(linked.body).toMatchObject({ status: 'linked', user: { username: 'linker', googleLinked: true, emailVerified: true } })

      const viaGoogle = await signInWithGoogle(account)
      expect(viaGoogle.body).toMatchObject({ status: 'signed-in', user: { username: 'linker' } })

      const viaPassword = await passwordLogin('linker')
      expect(viaPassword.status).toBe(200)
      expect(viaPassword.body.user).toMatchObject({ username: 'linker', googleLinked: true })
      expect(viaPassword.body.user.id).toBe(viaGoogle.body.user.id)
    })

    it('fills in a missing email from Google, verified', async () => {
      const token = await registerWithPassword('linknoemail')
      const account = nextGoogleAccount()

      await signInWithGoogle(account, { intent: 'link', token })
      expect((await me(token)).body.user).toMatchObject({ email: account.email, emailVerified: true, googleLinked: true })
    })

    it('leaves a different, unverified email unverified', async () => {
      const token = await registerWithPassword('linkother', 'someone.else@example.com')

      await signInWithGoogle(nextGoogleAccount(), { intent: 'link', token })
      expect((await me(token)).body.user).toMatchObject({ email: 'someone.else@example.com', emailVerified: false, googleLinked: true })
    })

    it('refuses to link a Google account that already belongs to another roommate', async () => {
      const account = nextGoogleAccount()
      const first = await signInWithGoogle(account)
      await complete({ signupToken: first.body.signupToken, mode: 'join', username: 'googleowner', apartmentCode: APARTMENT_CODE })

      const token = await registerWithPassword('googlethief')
      const res = await signInWithGoogle(account, { intent: 'link', token })
      expect(res.status).toBe(409)
      expect((await me(token)).body.user.googleLinked).toBe(false)
    })

    it('requires sign-in to link, and only finishes for the account that started it', async () => {
      googleSignsInAs(nextGoogleAccount())
      expect((await start('link')).status).toBe(401)

      const starter = await registerWithPassword('linkstarter')
      const other = await registerWithPassword('linkfinisher')
      const started = await start('link', starter)

      expect((await callback({ code: 'auth-code', state: started.body.state })).status).toBe(401)
      expect((await callback({ code: 'auth-code', state: started.body.state }, other)).status).toBe(400)
      expect((await me(other)).body.user.googleLinked).toBe(false)
    })
  })
})
