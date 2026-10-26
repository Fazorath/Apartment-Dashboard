import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../app.js'

const PASSWORD = 'maple-street-kettle'
const HOME = 'DISPA1'
const OTHER_HOME = 'DISPB1'

let userCount = 0
const bearer = (req, token) => req.set('Authorization', `Bearer ${token}`)

const openApartment = async (apartmentCode, apartmentName) => {
  const username = `viewer${++userCount}`
  const res = await request(app).post('/api/auth/create-apartment').send({ username, password: PASSWORD, apartmentCode, apartmentName })
  expect(res.status).toBe(201)
  return { username, token: res.body.token }
}
const joinApartment = async (apartmentCode) => {
  const username = `viewer${++userCount}`
  const res = await request(app).post('/api/auth/register').send({ username, password: PASSWORD, apartmentCode })
  expect(res.status).toBe(201)
  return { username, token: res.body.token }
}

const startPairing = () => request(app).post('/api/display/pairing')
const poll = (pairingSecret) => request(app).post('/api/display/pairing/poll').send({ pairingSecret })
const pair = (token, code) => bearer(request(app).post('/api/display/pair'), token).send({ code })
const status = (token) => bearer(request(app).get('/api/display/status'), token)
const unpair = (token) => bearer(request(app).delete('/api/display'), token)
const displayChores = (credential) => bearer(request(app).get('/api/display/chores'), credential)

// Start on a TV, enter the code as a Roommate, collect the credential on the TV
const pairDisplay = async (roommate) => {
  const { body: tv } = await startPairing()
  expect((await pair(roommate.token, tv.code)).status).toBe(200)
  const { body } = await poll(tv.pairingSecret)
  expect(body.status).toBe('paired')
  return body.credential
}

const addChore = async (token, chore) => {
  const res = await bearer(request(app).post('/api/tasks'), token).send({ frequencyDays: 7, ...chore })
  expect(res.status).toBe(201)
  return res.body
}

const withClockMoved = async (ms, action) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    vi.setSystemTime(Date.now() + ms)
    return await action()
  } finally {
    vi.useRealTimers()
  }
}
const MINUTE = 60 * 1000

describe('Display pairing', () => {
  it('pairs end to end: start, a Roommate claims the code, the TV collects its credential once', async () => {
    const roommate = await openApartment(HOME, 'Display Flat')

    const start = await startPairing()
    expect(start.status).toBe(201)
    expect(start.body.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/)
    expect(start.body.pairingSecret).toBeTruthy()
    expect(new Date(start.body.expiresAt).getTime()).toBeGreaterThan(Date.now())

    expect((await poll(start.body.pairingSecret)).body).toEqual({ status: 'pending' })

    expect((await pair(roommate.token, start.body.code)).status).toBe(200)

    const first = await poll(start.body.pairingSecret)
    expect(first.body.status).toBe('paired')
    expect(first.body.credential).toBeTruthy()
    expect((await displayChores(first.body.credential)).status).toBe(200)

    const second = await poll(start.body.pairingSecret)
    expect(second.body.credential).toBeUndefined()
    expect(second.body.status).toBe('expired')
  })

  it('gives a polling TV with an unknown secret the same answer as an expired code', async () => {
    expect((await poll('not-a-secret')).body).toEqual({ status: 'expired' })
    expect((await request(app).post('/api/display/pairing/poll').send({})).body).toEqual({ status: 'expired' })
  })

  it('accepts the code typed in lower case, with spaces or a dash', async () => {
    const roommate = await joinApartment(HOME)
    const { body: tv } = await startPairing()
    const typed = `${tv.code.slice(0, 3)}-${tv.code.slice(3)}`.toLowerCase()
    expect((await pair(roommate.token, typed)).status).toBe(200)
  })

  it('needs a Roommate session to enter a code', async () => {
    const { body: tv } = await startPairing()
    expect((await request(app).post('/api/display/pair').send({ code: tv.code })).status).toBe(401)
  })

  it('shows the same error for a wrong, an expired and an already-used code', async () => {
    const roommate = await joinApartment(HOME)

    const wrong = await pair(roommate.token, 'ABCDEF')

    const { body: old } = await startPairing()
    const expired = await withClockMoved(11 * MINUTE, () => pair(roommate.token, old.code))

    const { body: used } = await startPairing()
    expect((await pair(roommate.token, used.code)).status).toBe(200)
    const reused = await pair(roommate.token, used.code)

    for (const res of [wrong, expired, reused]) {
      expect(res.status).toBe(400)
      expect(res.body.error).toBe(wrong.body.error)
    }
    expect(wrong.body.error).toMatch(/wrong, expired or already used/)
  })

  it('tells a polling TV its code expired once ten minutes pass', async () => {
    const { body: tv } = await startPairing()
    expect((await withClockMoved(9 * MINUTE, () => poll(tv.pairingSecret))).body.status).toBe('pending')
    expect((await withClockMoved(11 * MINUTE, () => poll(tv.pairingSecret))).body.status).toBe('expired')
  })

  it('does not let a code pair a second screen', async () => {
    const roommate = await joinApartment(HOME)
    const { body: tv } = await startPairing()
    expect((await pair(roommate.token, tv.code)).status).toBe(200)
    const other = await joinApartment(HOME)
    expect((await pair(other.token, tv.code)).status).toBe(400)
  })
})

describe('Display status and unpairing', () => {
  it('shows who paired, when, and updates last seen when the TV reads its Chores', async () => {
    const roommate = await openApartment('DISPC1', 'Status Flat')
    expect((await status(roommate.token)).body).toEqual({ paired: false })

    const credential = await pairDisplay(roommate)
    const before = (await status(roommate.token)).body
    expect(before.paired).toBe(true)
    expect(before.pairedBy).toBe(roommate.username)
    expect(new Date(before.pairedAt).getTime()).not.toBeNaN()
    expect(before.lastSeen).toBeNull()

    await displayChores(credential)
    const after = (await status(roommate.token)).body
    expect(new Date(after.lastSeen).getTime()).not.toBeNaN()
  })

  it('lets any Roommate of the Apartment see the status and unpair, after which the credential gets 401', async () => {
    const pairer = await openApartment('DISPD1', 'Unpair Flat')
    const other = await joinApartment('DISPD1')
    const credential = await pairDisplay(pairer)

    expect((await status(other.token)).body.paired).toBe(true)
    expect((await unpair(other.token)).status).toBe(200)

    expect((await status(pairer.token)).body.paired).toBe(false)
    expect((await displayChores(credential)).status).toBe(401)
  })

  it('succeeds in unpairing even when nothing is paired', async () => {
    const roommate = await openApartment('DISPE1', 'Empty Flat')
    expect((await unpair(roommate.token)).status).toBe(200)
  })

  it('leaves another Apartment alone', async () => {
    const mine = await openApartment('DISPF1', 'Mine')
    const theirs = await openApartment('DISPF2', 'Theirs')
    const credential = await pairDisplay(mine)

    expect((await status(theirs.token)).body.paired).toBe(false)
    await unpair(theirs.token)
    expect((await displayChores(credential)).status).toBe(200)
  })

  it('pairing a second screen revokes the first', async () => {
    const roommate = await openApartment('DISPG1', 'Replace Flat')
    const first = await pairDisplay(roommate)
    const second = await pairDisplay(roommate)

    expect((await displayChores(first)).status).toBe(401)
    expect((await displayChores(second)).status).toBe(200)
  })

  it('needs a Roommate session for status and unpair', async () => {
    expect((await request(app).get('/api/display/status')).status).toBe(401)
    expect((await request(app).delete('/api/display')).status).toBe(401)
  })
})

describe('Display Chores', () => {
  it('returns only its own Apartment\'s active Chores, with only the allowlisted fields', async () => {
    const roommate = await openApartment(HOME + 'X', 'Chores Flat')
    const stranger = await openApartment(OTHER_HOME, 'Elsewhere')
    await addChore(roommate.token, { name: 'Dishes', assignedTo: 'Sam', notes: 'private note', tags: ['kitchen'], priority: 'high', pinned: true })
    const paused = await addChore(roommate.token, { name: 'Paused one' })
    await bearer(request(app).put(`/api/tasks/${paused._id}`), roommate.token).send({ active: false })
    await addChore(stranger.token, { name: 'Their secret chore' })

    const credential = await pairDisplay(roommate)
    const res = await displayChores(credential)

    expect(res.status).toBe(200)
    expect(res.body.apartmentName).toBe('Chores Flat')
    expect(new Date(res.body.serverTime).getTime()).toBeLessThan(Date.now() + 5000)
    expect(res.body.chores).toHaveLength(1)
    const allowed = ['assignedTo', 'frequencyDays', 'id', 'lastCompleted', 'lastCompletedBy', 'lastDone', 'name', 'pinned', 'priority']
    for (const key of Object.keys(res.body.chores[0])) expect(allowed).toContain(key)
    expect(res.body.chores[0]).toMatchObject({ name: 'Dishes', assignedTo: 'Sam', frequencyDays: 7, pinned: true, priority: 'high' })
    const text = JSON.stringify(res.body)
    for (const hidden of ['private note', 'kitchen', 'notes', 'tags', 'user', 'Paused one', 'Their secret chore']) {
      expect(text).not.toContain(hidden)
    }
  })

  it('rejects a missing, made-up or session credential', async () => {
    const roommate = await openApartment('DISPH1', 'Reject Flat')
    expect((await request(app).get('/api/display/chores')).status).toBe(401)
    expect((await displayChores('made-up')).status).toBe(401)
    expect((await displayChores(roommate.token)).status).toBe(401)
  })

  it('is refused by every session-protected route', async () => {
    const roommate = await openApartment('DISPI1', 'Closed Flat')
    const chore = await addChore(roommate.token, { name: 'Sweep' })
    const credential = await pairDisplay(roommate)

    const attempts = [
      bearer(request(app).get('/api/tasks'), credential),
      bearer(request(app).post('/api/tasks'), credential).send({ name: 'Mop', frequencyDays: 3 }),
      bearer(request(app).put(`/api/tasks/${chore._id}`), credential).send({ name: 'Changed' }),
      bearer(request(app).post(`/api/tasks/${chore._id}/done`), credential),
      bearer(request(app).delete(`/api/tasks/${chore._id}`), credential),
      bearer(request(app).get('/api/auth/me'), credential),
      bearer(request(app).get('/api/display/status'), credential),
      bearer(request(app).delete('/api/display'), credential),
      bearer(request(app).post('/api/display/pair'), credential).send({ code: 'ABCDEF' })
    ]
    for (const attempt of attempts) expect((await attempt).status).toBe(401)
  })
})
