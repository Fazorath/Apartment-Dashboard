import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildApp } from '../app.js'
import { checkProductionConfig } from '../config.js'
import { startPairingLimiter } from '../routes/display.js'

describe('Serving the built frontend', () => {
  let dir
  let app
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rd-static-'))
    fs.writeFileSync(path.join(dir, 'index.html'), '<html><body>roommate-dash-shell</body></html>')
    fs.mkdirSync(path.join(dir, 'assets'))
    fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'console.log("asset")')
    app = buildApp({ STATIC_DIR: dir })
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  it('serves the index at the root', async () => {
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.text).toContain('roommate-dash-shell')
  })

  it('serves a built asset', async () => {
    const res = await request(app).get('/assets/app.js')
    expect(res.status).toBe(200)
    expect(res.text).toContain('console.log("asset")')
  })

  it('falls back to the index for deep links', async () => {
    for (const url of ['/display', '/verify-email?token=x', '/auth/google/callback?code=y']) {
      const res = await request(app).get(url)
      expect(res.status).toBe(200)
      expect(res.text).toContain('roommate-dash-shell')
    }
  })

  it('keeps the JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Route not found' })
  })

  it('404s a missing asset instead of answering with the index', async () => {
    const res = await request(app).get('/assets/old-hash.js')
    expect(res.status).toBe(404)
  })

  it('still serves the API', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('OK')
  })

  it('does not serve the frontend when no static directory is set', async () => {
    const res = await request(buildApp({})).get('/display')
    expect(res.status).toBe(404)
  })

  it('does not serve the frontend when the static directory is missing', async () => {
    const res = await request(buildApp({ STATIC_DIR: path.join(dir, 'nope') })).get('/display')
    expect(res.status).toBe(404)
  })
})

describe('Behind a reverse proxy', () => {
  const IPS = ['203.0.113.1', '203.0.113.2']
  beforeEach(async () => {
    for (const ip of [...IPS, '::ffff:127.0.0.1', '::1', '127.0.0.1']) await startPairingLimiter.resetKey(ip)
  })

  const start = (app, ip) => request(app).post('/api/display/pairing').set('X-Forwarded-For', ip)

  it('rate limits each client address separately with TRUST_PROXY=1', async () => {
    const app = buildApp({ TRUST_PROXY: '1' })
    for (let i = 0; i < 10; i++) expect((await start(app, IPS[0])).status).toBe(201)
    expect((await start(app, IPS[0])).status).toBe(429)
    expect((await start(app, IPS[1])).status).toBe(201)
  })

  it('without TRUST_PROXY, ignores X-Forwarded-For', async () => {
    const app = buildApp({})
    for (let i = 0; i < 10; i++) expect((await start(app, IPS[0])).status).toBe(201)
    expect((await start(app, IPS[1])).status).toBe(429)
  })
})

describe('TRUST_PROXY values', () => {
  it('accepts true and false without crashing', () => {
    expect(() => buildApp({ TRUST_PROXY: 'true' })).not.toThrow()
    expect(() => buildApp({ TRUST_PROXY: 'false' })).not.toThrow()
  })
})

describe('Production startup checks', () => {
  const ok = { NODE_ENV: 'production', JWT_SECRET: 's3cret', MONGODB_URI: 'mongodb://mongo:27017' }

  it('accepts a complete production config', () => {
    expect(checkProductionConfig(ok)).toEqual([])
  })

  it('names each missing variable in production', () => {
    expect(checkProductionConfig({ NODE_ENV: 'production', MONGODB_URI: ok.MONGODB_URI })).toEqual(['JWT_SECRET'])
    expect(checkProductionConfig({ NODE_ENV: 'production', JWT_SECRET: 'x' })).toEqual(['MONGODB_URI'])
    expect(checkProductionConfig({ NODE_ENV: 'production', JWT_SECRET: '  ', MONGODB_URI: '' })).toEqual(['JWT_SECRET', 'MONGODB_URI'])
  })

  it('requires nothing outside production', () => {
    expect(checkProductionConfig({})).toEqual([])
    expect(checkProductionConfig({ NODE_ENV: 'development' })).toEqual([])
  })
})
