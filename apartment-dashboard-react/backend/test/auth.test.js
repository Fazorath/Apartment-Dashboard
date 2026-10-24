import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { getUserModel } from '../models/User.js'

const STRONG_PASSWORD = 'maple-street-kettle'
const FIRST_USER = { username: 'first', password: STRONG_PASSWORD }
// GP412 is on the default allowlist, so its first user can open the apartment
const APARTMENT_CODE = 'GP412'
const APARTMENT_NAME = 'Gainesville Place 412'

const register = (body) => request(app).post('/api/auth/register').send(body)
const login = (body) => request(app).post('/api/auth/login').send(body)

describe('auth API', () => {
  beforeAll(async () => {
    const res = await register({ ...FIRST_USER, apartmentCode: APARTMENT_CODE })
    expect(res.status).toBe(201)
  })

  it('registers a new user into an existing apartment', async () => {
    const res = await register({ username: 'roommate', password: STRONG_PASSWORD, apartmentCode: APARTMENT_CODE.toLowerCase() })

    expect(res.status).toBe(201)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user).toMatchObject({
      username: 'roommate',
      apartmentCode: APARTMENT_CODE,
      apartmentName: APARTMENT_NAME
    })
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('creates a new apartment and makes its creator the first user', async () => {
    const res = await request(app).post('/api/auth/create-apartment').send({
      username: 'landlord',
      password: STRONG_PASSWORD,
      apartmentCode: 'NEWAPT',
      apartmentName: 'New Apartment'
    })

    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ username: 'landlord', apartmentCode: 'NEWAPT', apartmentName: 'New Apartment' })
    expect(res.body.token).toEqual(expect.any(String))
  })

  it('logs in with the right password', async () => {
    const res = await login(FIRST_USER)

    expect(res.status).toBe(200)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user.username).toBe('first')
  })

  it('rejects login with the wrong password', async () => {
    const res = await login({ ...FIRST_USER, password: 'wrong-pass' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
    expect(res.body.token).toBeUndefined()
  })

  it('returns the current user from /me with a valid token', async () => {
    const session = await login(FIRST_USER)
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${session.body.token}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ username: 'first', apartmentCode: APARTMENT_CODE })
  })

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('No token provided')
  })

  describe('password policy', () => {
    it('rejects joining an apartment with a weak password and says why', async () => {
      const res = await register({ username: 'weakling', password: 'weakling', apartmentCode: APARTMENT_CODE })

      expect(res.status).toBe(400)
      expect(res.body.reasons).toEqual([
        'Use at least 10 characters.',
        'Your password can’t be your username.'
      ])
      expect(res.body.error).toEqual(expect.any(String))
      expect(res.body.token).toBeUndefined()
    })

    it('rejects creating an apartment with a common password and says why', async () => {
      const res = await request(app).post('/api/auth/create-apartment').send({
        username: 'commoner',
        password: 'Password123',
        apartmentCode: 'WEAKAPT',
        apartmentName: 'Weak Apartment'
      })

      expect(res.status).toBe(400)
      expect(res.body.reasons).toEqual(['This password is too common.'])
      expect(res.body.token).toBeUndefined()
    })

    it('still lets existing users log in with an older, shorter password', async () => {
      // Seeded through the model: the API no longer accepts a password this short
      const User = await getUserModel()
      await User.create({ username: 'oldtimer', password: 'secret1', apartmentCode: APARTMENT_CODE, apartmentName: APARTMENT_NAME })

      const res = await login({ username: 'oldtimer', password: 'secret1' })

      expect(res.status).toBe(200)
      expect(res.body.token).toEqual(expect.any(String))
    })
  })
})
