import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app.js'

describe('Display pairing rate limits', () => {
  it('limits starting pairings', async () => {
    let last
    for (let i = 0; i < 31; i++) last = await request(app).post('/api/display/pairing')
    expect(last.status).toBe(429)
  })

  it('limits wrong codes, but not the polling that happens every few seconds', async () => {
    const signUp = await request(app).post('/api/auth/create-apartment')
      .send({ username: 'limited1', password: 'maple-street-kettle', apartmentCode: 'DISPL1', apartmentName: 'Limit Flat' })
    const guess = () => request(app).post('/api/display/pair').set('Authorization', `Bearer ${signUp.body.token}`).send({ code: 'ABCDEF' })

    let last
    for (let i = 0; i < 11; i++) last = await guess()
    expect(last.status).toBe(429)

    let poll
    for (let i = 0; i < 100; i++) poll = await request(app).post('/api/display/pairing/poll').send({ pairingSecret: 'x' })
    expect(poll.status).toBe(200)
  })
})
