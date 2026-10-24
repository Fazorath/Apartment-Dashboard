import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'

const register = (body) => request(app).post('/api/auth/register').send(body)

describe('auth API', () => {
  beforeAll(async () => {
    // GP412 is on the default allowlist, so the first user can open it
    await register({ username: 'first', password: 'secret1', apartmentCode: 'GP412' })
  })

  it('registers a new user into an existing apartment', async () => {
    const res = await register({ username: 'roommate', password: 'secret1', apartmentCode: 'gp412' })

    expect(res.status).toBe(201)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user).toMatchObject({
      username: 'roommate',
      apartmentCode: 'GP412',
      apartmentName: 'Gainesville Place 412'
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
    const res = await request(app).post('/api/auth/login').send({ username: 'first', password: 'secret1' })

    expect(res.status).toBe(200)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user.username).toBe('first')
  })

  it('rejects login with the wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'first', password: 'wrong-pass' })

    expect(res.status).toBe(401)
    expect(res.body.token).toBeUndefined()
  })

  it('returns the current user from /me with a valid token', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: 'first', password: 'secret1' })
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toMatchObject({ username: 'first', apartmentCode: 'GP412' })
  })

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
  })
})
