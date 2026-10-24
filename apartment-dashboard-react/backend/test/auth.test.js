import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'

const FIRST_USER = { username: 'first', password: 'secret1' }
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
    const res = await register({ username: 'roommate', password: 'secret1', apartmentCode: APARTMENT_CODE.toLowerCase() })

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
      password: 'secret1',
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
})
