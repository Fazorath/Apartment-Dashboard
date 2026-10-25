import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { outbox, clearOutbox } from '../utils/mailer.js'

const STRONG_PASSWORD = 'maple-street-kettle'
const NEW_PASSWORD = 'harbor-lantern-copper'
// AL420 is on the default allowlist; the other suites use GP412 and verifier accounts
const APARTMENT_CODE = 'AL420'

let userCount = 0
const nextName = () => `resetter${++userCount}`

const register = (body) => request(app).post('/api/auth/register').send({ password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE, ...body })
const login = (username, password) => request(app).post('/api/auth/login').send({ username, password })
const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
const chores = (token) => request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`)
const verify = (token) => request(app).post('/api/auth/verify-email').send({ token })
const requestReset = (identifier) => request(app).post('/api/auth/request-password-reset').send({ identifier })
const reset = (token, password) => request(app).post('/api/auth/reset-password').send({ token, password })

const lastMailTo = (address) => outbox.filter((m) => m.to === address).at(-1)
const resetTokenFrom = (mail) => mail.text.match(/reset-password\?token=([A-Za-z0-9_-]+)/)[1]

// Sign up (optionally with a verified email) and return what the tests need
const signUp = async ({ email, verified = false } = {}) => {
  const username = nextName()
  const res = await register({ username, email })
  if (verified) await verify(lastMailTo(email.toLowerCase()).text.match(/verify-email\?token=([A-Za-z0-9_-]+)/)[1])
  clearOutbox()
  return { username, email, token: res.body.token }
}

// Ask for a reset and pull the token out of the email that arrives
const resetTokenFor = async (account) => {
  await requestReset(account.username)
  await vi.waitFor(() => expect(lastMailTo(account.email)).toBeDefined())
  return resetTokenFrom(lastMailTo(account.email))
}

describe('forgot password', () => {
  beforeEach(() => clearOutbox())

  describe('requesting a reset', () => {
    it('answers the same for existing and non-existing accounts', async () => {
      const account = await signUp({ email: 'same@example.com', verified: true })

      const existing = await requestReset(account.username)
      const missing = await requestReset('nobody-has-this-name')
      const missingEmail = await requestReset('nobody@example.com')

      expect(existing.status).toBe(200)
      expect(missing.status).toBe(existing.status)
      expect(missing.body).toEqual(existing.body)
      expect(missingEmail.body).toEqual(existing.body)
    })

    it('emails a reset link to a verified address, found by username or by email', async () => {
      const account = await signUp({ email: 'Verified.Person@Example.com', verified: true })

      await requestReset(account.username)
      await vi.waitFor(() => expect(lastMailTo('verified.person@example.com')).toBeDefined())
      expect(lastMailTo('verified.person@example.com').subject).toMatch(/reset/i)

      clearOutbox()
      await requestReset('  VERIFIED.person@example.com ')
      await vi.waitFor(() => expect(lastMailTo('verified.person@example.com')).toBeDefined())
    })

    it('sends nothing when the email is unverified or missing', async () => {
      const unverified = await signUp({ email: 'unverified@example.com' })
      const noEmail = await signUp()

      const a = await requestReset(unverified.username)
      const b = await requestReset(noEmail.username)
      const c = await requestReset('unverified@example.com')
      await new Promise((r) => setTimeout(r, 100))

      expect([a.status, b.status, c.status]).toEqual([200, 200, 200])
      expect(outbox).toHaveLength(0)
    })

    it('requires an identifier', async () => {
      expect((await requestReset('')).status).toBe(400)
      expect((await request(app).post('/api/auth/request-password-reset').send({})).status).toBe(400)
    })

    it('is rate-limited per account, and the limit answers the same whether or not it exists', async () => {
      const account = await signUp({ email: 'limited@example.com', verified: true })

      const statuses = []
      for (let i = 0; i < 4; i++) statuses.push((await requestReset(account.username)).status)
      const ghostStatuses = []
      for (let i = 0; i < 4; i++) ghostStatuses.push((await requestReset('no-such-account')).status)

      expect(statuses).toEqual([200, 200, 200, 429])
      expect(ghostStatuses).toEqual(statuses)
    })
  })

  describe('resetting', () => {
    it('sets the new password: the old one stops working, the new one signs in', async () => {
      const account = await signUp({ email: 'swap@example.com', verified: true })
      const token = await resetTokenFor(account)

      const res = await reset(token, NEW_PASSWORD)
      expect(res.status).toBe(200)

      expect((await login(account.username, STRONG_PASSWORD)).status).toBe(401)
      expect((await login(account.username, NEW_PASSWORD)).status).toBe(200)
    })

    it('signs out sessions started before the reset, including via /me', async () => {
      const account = await signUp({ email: 'signout@example.com', verified: true })
      expect((await chores(account.token)).status).toBe(200)

      await reset(await resetTokenFor(account), NEW_PASSWORD)

      expect((await chores(account.token)).status).toBe(401)
      expect((await me(account.token)).status).toBe(401)
    })

    it('keeps sessions started after the reset working, even in the same second', async () => {
      const account = await signUp({ email: 'fresh@example.com', verified: true })
      await reset(await resetTokenFor(account), NEW_PASSWORD)

      const fresh = await login(account.username, NEW_PASSWORD)
      expect((await chores(fresh.body.token)).status).toBe(200)
      expect((await me(fresh.body.token)).status).toBe(200)
    })

    it('works only once', async () => {
      const account = await signUp({ email: 'once@example.com', verified: true })
      const token = await resetTokenFor(account)

      expect((await reset(token, NEW_PASSWORD)).status).toBe(200)
      const reused = await reset(token, 'another-strong-phrase')
      expect(reused.status).toBe(400)
      expect(reused.body.reason).toBe('invalid')
      expect((await login(account.username, NEW_PASSWORD)).status).toBe(200)
    })

    it('rejects a link opened more than an hour later', async () => {
      const account = await signUp({ email: 'late@example.com', verified: true })
      const token = await resetTokenFor(account)

      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        vi.setSystemTime(Date.now() + 61 * 60 * 1000)
        const res = await reset(token, NEW_PASSWORD)
        expect(res.status).toBe(400)
        expect(res.body.reason).toBe('expired')
      } finally {
        vi.useRealTimers()
      }
      expect((await login(account.username, STRONG_PASSWORD)).status).toBe(200)
    })

    it('still accepts a link just under an hour old', async () => {
      const account = await signUp({ email: 'justintime@example.com', verified: true })
      const token = await resetTokenFor(account)

      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        vi.setSystemTime(Date.now() + 59 * 60 * 1000)
        expect((await reset(token, NEW_PASSWORD)).status).toBe(200)
      } finally {
        vi.useRealTimers()
      }
    })

    it('rejects tampered, unknown and missing tokens', async () => {
      const account = await signUp({ email: 'tamper@example.com', verified: true })
      const token = await resetTokenFor(account)
      const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')

      for (const bad of [tampered, 'not-a-real-token', '', undefined, { $ne: null }]) {
        const res = await reset(bad, NEW_PASSWORD)
        expect(res.status).toBe(400)
      }
      expect((await login(account.username, STRONG_PASSWORD)).status).toBe(200)
    })

    it('makes an earlier link stop working when a newer one is requested', async () => {
      const account = await signUp({ email: 'newer@example.com', verified: true })
      const first = await resetTokenFor(account)
      clearOutbox()
      const second = await resetTokenFor(account)

      expect(second).not.toBe(first)
      expect((await reset(first, NEW_PASSWORD)).status).toBe(400)
      expect((await reset(second, NEW_PASSWORD)).status).toBe(200)
    })

    it('enforces the password policy and keeps the link usable after a rejected password', async () => {
      const account = await signUp({ email: 'policy@example.com', verified: true })
      const token = await resetTokenFor(account)

      const short = await reset(token, 'short')
      expect(short.status).toBe(400)
      expect(short.body.reasons.length).toBeGreaterThan(0)
      expect((await reset(token, 'password123')).status).toBe(400)
      expect((await reset(token, account.username)).status).toBe(400)
      expect((await reset(token, undefined)).status).toBe(400)

      expect((await login(account.username, STRONG_PASSWORD)).status).toBe(200)
      expect((await reset(token, NEW_PASSWORD)).status).toBe(200)
    })

    it('does not touch other accounts that share an email', async () => {
      const a = await signUp({ email: 'shared@example.com', verified: true })
      const b = await signUp({ email: 'shared@example.com', verified: true })

      await reset(await resetTokenFor(a), NEW_PASSWORD)

      expect((await login(b.username, STRONG_PASSWORD)).status).toBe(200)
      expect((await chores(b.token)).status).toBe(200)
    })
  })
})
