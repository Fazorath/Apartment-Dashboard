import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { outbox, clearOutbox } from '../utils/mailer.js'

const STRONG_PASSWORD = 'maple-street-kettle'
// AL420 is on the default allowlist; auth.test.js uses GP412
const APARTMENT_CODE = 'AL420'

let userCount = 0
const nextUsername = () => `verifier${++userCount}`

const register = (body) => request(app).post('/api/auth/register').send({ password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE, ...body })
const verify = (token) => request(app).post('/api/auth/verify-email').send({ token })
const changeEmail = (token, email) => request(app).put('/api/auth/email').set('Authorization', `Bearer ${token}`).send({ email })
const resend = (token) => request(app).post('/api/auth/send-verification').set('Authorization', `Bearer ${token}`)
const me = (token) => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

const lastMailTo = (address) => outbox.filter((m) => m.to === address).at(-1)
const tokenFrom = (mail) => mail.text.match(/verify-email\?token=([A-Za-z0-9_-]+)/)[1]

describe('email verification', () => {
  beforeEach(() => clearOutbox())

  it('sends a verification link when a roommate signs up with an email', async () => {
    const res = await register({ username: nextUsername(), email: 'New.Roommate@Example.com' })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'new.roommate@example.com', emailVerified: false })

    const mail = lastMailTo('new.roommate@example.com')
    expect(mail.subject).toMatch(/verify/i)
    expect(mail.text).toContain('/verify-email?token=')

    const profile = await me(res.body.token)
    expect(profile.body.user).toMatchObject({ email: 'new.roommate@example.com', emailVerified: false })
  })

  it('marks the email verified when the link is opened, and the link works only once', async () => {
    const signup = await register({ username: nextUsername(), email: 'once@example.com' })
    const token = tokenFrom(lastMailTo('once@example.com'))

    const res = await verify(token)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect((await me(signup.body.token)).body.user.emailVerified).toBe(true)

    const reused = await verify(token)
    expect(reused.status).toBe(400)
    expect(reused.body.error).toEqual(expect.any(String))
  })

  it('rejects a link opened more than 24 hours later', async () => {
    const signup = await register({ username: nextUsername(), email: 'late@example.com' })
    const token = tokenFrom(lastMailTo('late@example.com'))

    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)
      const res = await verify(token)
      expect(res.status).toBe(400)
      expect(res.body.reason).toBe('expired')
    } finally {
      vi.useRealTimers()
    }
    expect((await me(signup.body.token)).body.user.emailVerified).toBe(false)
  })

  it('lets a roommate without an email add one and verify it', async () => {
    const signup = await register({ username: nextUsername() })
    expect(outbox).toHaveLength(0)

    const res = await changeEmail(signup.body.token, 'added@example.com')
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ email: 'added@example.com', emailVerified: false })

    expect((await verify(tokenFrom(lastMailTo('added@example.com')))).status).toBe(200)
    expect((await me(signup.body.token)).body.user.emailVerified).toBe(true)
  })

  it('resets verification and sends a new link when the email changes', async () => {
    const signup = await register({ username: nextUsername(), email: 'before@example.com' })
    const oldToken = tokenFrom(lastMailTo('before@example.com'))
    await verify(oldToken)

    const res = await changeEmail(signup.body.token, 'after@example.com')
    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ email: 'after@example.com', emailVerified: false })
    expect(lastMailTo('after@example.com')).toBeDefined()
    expect((await me(signup.body.token)).body.user).toMatchObject({ email: 'after@example.com', emailVerified: false })
  })

  it('makes an earlier link stop working once the email changes', async () => {
    const signup = await register({ username: nextUsername(), email: 'typo@exmaple.com' })
    const typoToken = tokenFrom(lastMailTo('typo@exmaple.com'))

    await changeEmail(signup.body.token, 'fixed@example.com')

    expect((await verify(typoToken)).status).toBe(400)
    expect((await me(signup.body.token)).body.user.emailVerified).toBe(false)
  })

  it('rejects an email that is not an address, and requires sign-in', async () => {
    const signup = await register({ username: nextUsername() })

    expect((await changeEmail(signup.body.token, 'not-an-email')).status).toBe(400)
    expect((await request(app).put('/api/auth/email').send({ email: 'x@example.com' })).status).toBe(401)
    expect(outbox).toHaveLength(0)
  })

  describe('resend', () => {
    it('sends a fresh link that verifies the email', async () => {
      const signup = await register({ username: nextUsername(), email: 'resend@example.com' })
      clearOutbox()

      const res = await resend(signup.body.token)
      expect(res.status).toBe(200)

      const mail = lastMailTo('resend@example.com')
      expect((await verify(tokenFrom(mail))).status).toBe(200)
      expect((await me(signup.body.token)).body.user.emailVerified).toBe(true)
    })

    it('refuses when there is no email or it is already verified', async () => {
      const noEmail = await register({ username: nextUsername() })
      expect((await resend(noEmail.body.token)).status).toBe(400)

      const verified = await register({ username: nextUsername(), email: 'done@example.com' })
      await verify(tokenFrom(lastMailTo('done@example.com')))
      clearOutbox()
      expect((await resend(verified.body.token)).status).toBe(400)
      expect(outbox).toHaveLength(0)
    })

    it('is rate-limited', async () => {
      const signup = await register({ username: nextUsername(), email: 'flood@example.com' })
      clearOutbox()

      const statuses = []
      for (let i = 0; i < 4; i++) statuses.push((await resend(signup.body.token)).status)

      expect(statuses).toEqual([200, 200, 200, 429])
      expect(outbox).toHaveLength(3)
    })

    it('counts email changes against the same limit, so switching addresses can’t flood an inbox', async () => {
      const signup = await register({ username: nextUsername() })

      const statuses = []
      for (let i = 0; i < 4; i++) {
        statuses.push((await changeEmail(signup.body.token, i % 2 ? 'ping@example.com' : 'pong@example.com')).status)
      }

      expect(statuses).toEqual([200, 200, 200, 429])
      expect(outbox).toHaveLength(3)
    })
  })

  it('rejects signing up with an email that is not an address', async () => {
    const res = await register({ username: nextUsername(), email: 'nope' })

    expect(res.status).toBe(400)
    expect(outbox).toHaveLength(0)
  })

  it('rejects an unknown or missing token', async () => {
    expect((await verify('not-a-real-token')).status).toBe(400)
    expect((await request(app).post('/api/auth/verify-email').send({})).status).toBe(400)
  })
})
