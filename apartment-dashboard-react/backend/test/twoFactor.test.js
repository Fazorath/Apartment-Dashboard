import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { totpCode } from '../utils/totp.js'
import { outbox, clearOutbox } from '../utils/mailer.js'

const STRONG_PASSWORD = 'maple-street-kettle'
const NEW_PASSWORD = 'harbor-lantern-copper'
// Each suite opens its own apartment; this one isn't on the allowlist, so it's created
const APARTMENT_CODE = 'TWOFA1'

let userCount = 0
const nextName = () => `guarded${++userCount}`

const auth = (req, token) => req.set('Authorization', `Bearer ${token}`)
const setup = (token) => auth(request(app).post('/api/auth/2fa/setup'), token)
const confirm = (token, code) => auth(request(app).post('/api/auth/2fa/confirm'), token).send({ code })
const disable = (token, code) => auth(request(app).post('/api/auth/2fa/disable'), token).send({ code })
const me = (token) => auth(request(app).get('/api/auth/me'), token)
const chores = (token) => auth(request(app).get('/api/tasks'), token)
const login = (username, password = STRONG_PASSWORD) => request(app).post('/api/auth/login').send({ username, password })
const loginCode = (twoFactorToken, code) => request(app).post('/api/auth/login/2fa').send({ twoFactorToken, code })

// The time step an authenticator app is on; codes from a later step aren't replays
const STEP_MS = 30 * 1000

const lastMailTo = (address) => outbox.filter((m) => m.to === address).at(-1)
const tokenFrom = (mail, path) => mail.text.match(new RegExp(`${path}\\?token=([A-Za-z0-9_-]+)`))[1]

let apartmentOpened = false
const signUp = async ({ email } = {}) => {
  const username = nextName()
  const body = { username, password: STRONG_PASSWORD, email, apartmentCode: APARTMENT_CODE }
  const res = apartmentOpened
    ? await request(app).post('/api/auth/register').send(body)
    : await request(app).post('/api/auth/create-apartment').send({ ...body, apartmentName: 'Two Factor Flat' })
  expect(res.status).toBe(201)
  apartmentOpened = true
  if (email) await request(app).post('/api/auth/verify-email').send({ token: tokenFrom(lastMailTo(email), 'verify-email') })
  return { username, email, token: res.body.token }
}

// Sign up and turn 2FA on; returns the secret and recovery codes as the user would have them
const signUpWithTwoFactor = async (options) => {
  const account = await signUp(options)
  const { secret } = (await setup(account.token)).body
  const { recoveryCodes } = (await confirm(account.token, totpCode(secret))).body
  return { ...account, secret, recoveryCodes }
}

// A code from the next time step, so it isn't the one setup just used
const nextCode = (secret, steps = 1) => totpCode(secret, Date.now() + steps * STEP_MS)

describe('two-factor login', () => {
  describe('turning it on', () => {
    it('gives a secret and a scannable QR code, but stays off until a code is confirmed', async () => {
      const account = await signUp()

      const res = await setup(account.token)
      expect(res.status).toBe(200)
      expect(res.body.secret).toMatch(/^[A-Z2-7]+$/)
      expect(res.body.otpauthUrl).toContain(`secret=${res.body.secret}`)
      expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/)

      expect((await me(account.token)).body.user.twoFactorEnabled).toBe(false)
    })

    it('refuses a wrong code and stays off', async () => {
      const account = await signUp()
      const { secret } = (await setup(account.token)).body
      const wrong = String((Number(totpCode(secret)) + 1) % 1000000).padStart(6, '0')

      const res = await confirm(account.token, wrong)
      expect(res.status).toBe(400)
      expect(res.body.recoveryCodes).toBeUndefined()
      expect((await me(account.token)).body.user.twoFactorEnabled).toBe(false)
    })

    it('turns on with a valid code and shows ten recovery codes once', async () => {
      const account = await signUp()
      const { secret } = (await setup(account.token)).body

      const res = await confirm(account.token, totpCode(secret))
      expect(res.status).toBe(200)
      expect(res.body.recoveryCodes).toHaveLength(10)
      expect(new Set(res.body.recoveryCodes).size).toBe(10)
      expect((await me(account.token)).body.user.twoFactorEnabled).toBe(true)

      // Nothing hands the codes or the secret out again
      const again = await confirm(account.token, totpCode(secret))
      expect(again.status).toBe(400)
      expect(again.body.recoveryCodes).toBeUndefined()
      expect(JSON.stringify((await me(account.token)).body)).not.toContain(res.body.recoveryCodes[0])
      expect(JSON.stringify((await me(account.token)).body)).not.toContain(secret)
    })

    it('requires being signed in', async () => {
      expect((await request(app).post('/api/auth/2fa/setup')).status).toBe(401)
      expect((await request(app).post('/api/auth/2fa/confirm').send({ code: '123456' })).status).toBe(401)
    })
  })

  describe('signing in', () => {
    it('without 2FA, a password alone still gives a session', async () => {
      const account = await signUp()
      const res = await login(account.username)
      expect(res.status).toBe(200)
      expect(res.body.twoFactorRequired).toBeUndefined()
      expect((await chores(res.body.token)).status).toBe(200)
    })

    it('with 2FA on, a password alone gives only a pending token, not a session', async () => {
      const account = await signUpWithTwoFactor()

      const res = await login(account.username)
      expect(res.status).toBe(200)
      expect(res.body.twoFactorRequired).toBe(true)
      expect(res.body.token).toBeUndefined()
      expect(res.body.user).toBeUndefined()
      expect(res.body.twoFactorToken).toEqual(expect.any(String))

      expect((await chores(res.body.twoFactorToken)).status).toBe(401)
      expect((await me(res.body.twoFactorToken)).status).toBe(401)
    })

    it('a wrong password still fails before any code is asked for', async () => {
      const account = await signUpWithTwoFactor()
      const res = await login(account.username, 'not-the-password')
      expect(res.status).toBe(401)
      expect(res.body.twoFactorToken).toBeUndefined()
    })

    it('a valid code from the app completes sign-in', async () => {
      const account = await signUpWithTwoFactor()
      const { twoFactorToken } = (await login(account.username)).body

      const res = await loginCode(twoFactorToken, nextCode(account.secret))
      expect(res.status).toBe(200)
      expect(res.body.user.username).toBe(account.username)
      expect((await chores(res.body.token)).status).toBe(200)
      expect((await me(res.body.token)).status).toBe(200)
    })

    it('rejects a wrong code, and a code from the app that was already used', async () => {
      const account = await signUpWithTwoFactor()
      const { twoFactorToken } = (await login(account.username)).body
      const code = nextCode(account.secret)

      const wrong = await loginCode(twoFactorToken, String((Number(code) + 1) % 1000000).padStart(6, '0'))
      expect(wrong.status).toBe(401)
      expect(wrong.body.token).toBeUndefined()

      expect((await loginCode(twoFactorToken, code)).status).toBe(200)
      const replay = await loginCode((await login(account.username)).body.twoFactorToken, code)
      expect(replay.status).toBe(401)
    })

    it('an unused recovery code completes sign-in once; a used one is rejected', async () => {
      const account = await signUpWithTwoFactor()
      const [first, second] = account.recoveryCodes

      const res = await loginCode((await login(account.username)).body.twoFactorToken, first)
      expect(res.status).toBe(200)
      expect((await chores(res.body.token)).status).toBe(200)

      const reused = await loginCode((await login(account.username)).body.twoFactorToken, first)
      expect(reused.status).toBe(401)
      expect(reused.body.token).toBeUndefined()

      // Typed loosely, the next code still works
      const loose = await loginCode((await login(account.username)).body.twoFactorToken, ` ${second.toUpperCase().replace('-', ' ')} `)
      expect(loose.status).toBe(200)
    })

    it('rejects a session token, a tampered or missing pending token, and a stale one', async () => {
      const account = await signUpWithTwoFactor()
      const { twoFactorToken } = (await login(account.username)).body
      const code = nextCode(account.secret)

      for (const bad of [account.token, twoFactorToken.slice(0, -2) + 'xx', '', undefined, { $ne: null }]) {
        const res = await loginCode(bad, code)
        expect(res.status).toBe(401)
      }

      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        vi.setSystemTime(Date.now() + 11 * 60 * 1000)
        expect((await loginCode(twoFactorToken, nextCode(account.secret))).status).toBe(401)
      } finally {
        vi.useRealTimers()
      }
    })
  })
  describe('password reset', () => {
    it('keeps 2FA on: the new password alone still needs a code', async () => {
      const account = await signUpWithTwoFactor({ email: 'guarded-reset@example.com' })
      const before = (await login(account.username)).body.twoFactorToken
      clearOutbox()

      await request(app).post('/api/auth/request-password-reset').send({ identifier: account.username })
      await vi.waitFor(() => expect(lastMailTo(account.email)).toBeDefined())
      const reset = await request(app).post('/api/auth/reset-password')
        .send({ token: tokenFrom(lastMailTo(account.email), 'reset-password'), password: NEW_PASSWORD })
      expect(reset.status).toBe(200)

      const res = await login(account.username, NEW_PASSWORD)
      expect(res.status).toBe(200)
      expect(res.body.twoFactorRequired).toBe(true)
      expect(res.body.token).toBeUndefined()

      // A pending token from before the reset no longer works; a fresh one does
      expect((await loginCode(before, nextCode(account.secret))).status).toBe(401)
      expect((await loginCode(res.body.twoFactorToken, nextCode(account.secret))).status).toBe(200)
    })
  })
  describe('turning it off', () => {
    it('refuses without a valid code and stays on', async () => {
      const account = await signUpWithTwoFactor()
      const code = nextCode(account.secret)

      for (const bad of [String((Number(code) + 1) % 1000000).padStart(6, '0'), '', undefined, 'not-a-code']) {
        expect((await disable(account.token, bad)).status).toBe(400)
      }
      expect((await me(account.token)).body.user.twoFactorEnabled).toBe(true)
      expect((await login(account.username)).body.twoFactorRequired).toBe(true)
    })

    it('turns off with a valid code: the password alone signs in again', async () => {
      const account = await signUpWithTwoFactor()

      const res = await disable(account.token, nextCode(account.secret))
      expect(res.status).toBe(200)
      expect((await me(account.token)).body.user.twoFactorEnabled).toBe(false)

      const signIn = await login(account.username)
      expect(signIn.body.twoFactorRequired).toBeUndefined()
      expect((await chores(signIn.body.token)).status).toBe(200)
    })

    it('also accepts a recovery code, for a lost phone', async () => {
      const account = await signUpWithTwoFactor()
      expect((await disable(account.token, account.recoveryCodes[3])).status).toBe(200)
      expect((await me(account.token)).body.user.twoFactorEnabled).toBe(false)
    })

    it('can be turned on again afterwards, with new recovery codes', async () => {
      const account = await signUpWithTwoFactor()
      await disable(account.token, nextCode(account.secret))

      const { secret } = (await setup(account.token)).body
      expect(secret).not.toBe(account.secret)
      const { recoveryCodes } = (await confirm(account.token, totpCode(secret))).body
      expect(recoveryCodes).toHaveLength(10)
      expect(recoveryCodes).not.toContain(account.recoveryCodes[0])

      const pending = (await login(account.username)).body.twoFactorToken
      expect((await loginCode(pending, account.recoveryCodes[0])).status).toBe(401)
    })

    it('says so when 2FA is already off', async () => {
      const account = await signUp()
      expect((await disable(account.token, '123456')).status).toBe(400)
    })
  })
  describe('rate limiting', () => {
    const wrongCode = (secret) => String((Number(nextCode(secret)) + 1) % 1000000).padStart(6, '0')

    it('locks out code guessing at sign-in, even with fresh pending tokens', async () => {
      const account = await signUpWithTwoFactor()

      const statuses = []
      for (let i = 0; i < 6; i++) {
        const pending = (await login(account.username)).body.twoFactorToken
        statuses.push((await loginCode(pending, wrongCode(account.secret))).status)
      }
      expect(statuses).toEqual([401, 401, 401, 401, 401, 429])

      // Even the right code waits out the lockout
      const pending = (await login(account.username)).body.twoFactorToken
      expect((await loginCode(pending, nextCode(account.secret))).status).toBe(429)
    })

    it('does not count successful sign-ins, and one account’s lockout leaves others alone', async () => {
      const busy = await signUpWithTwoFactor()
      const bystander = await signUpWithTwoFactor()

      for (const code of busy.recoveryCodes.slice(0, 6)) {
        const pending = (await login(busy.username)).body.twoFactorToken
        expect((await loginCode(pending, code)).status).toBe(200)
      }
      // Six successes used none of the budget, so five misses are still just misses
      for (let i = 0; i < 5; i++) {
        const pending = (await login(busy.username)).body.twoFactorToken
        expect((await loginCode(pending, wrongCode(busy.secret))).status).toBe(401)
      }
      expect((await disable(busy.token, wrongCode(busy.secret))).status).toBe(429)

      const pending = (await login(bystander.username)).body.twoFactorToken
      expect((await loginCode(pending, nextCode(bystander.secret))).status).toBe(200)
    })

    it('limits confirming setup and turning it off too', async () => {
      const account = await signUp()
      const { secret } = (await setup(account.token)).body
      const statuses = []
      for (let i = 0; i < 6; i++) statuses.push((await confirm(account.token, wrongCode(secret))).status)
      expect(statuses).toEqual([400, 400, 400, 400, 400, 429])

      const other = await signUpWithTwoFactor()
      const offStatuses = []
      for (let i = 0; i < 6; i++) offStatuses.push((await disable(other.token, wrongCode(other.secret))).status)
      expect(offStatuses).toEqual([400, 400, 400, 400, 400, 429])
    })
  })
})
