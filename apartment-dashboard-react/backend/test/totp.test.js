import { describe, it, expect } from 'vitest'
import { generateSecret, totpCode, verifyTotp, otpauthUrl } from '../utils/totp.js'

// RFC 6238 appendix B: the SHA-1 seed "12345678901234567890", base32-encoded
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('totp', () => {
  it('matches the RFC 6238 SHA-1 test vectors (last six digits)', () => {
    expect(totpCode(RFC_SECRET, 59 * 1000)).toBe('287082')
    expect(totpCode(RFC_SECRET, 1111111109 * 1000)).toBe('081804')
    expect(totpCode(RFC_SECRET, 1111111111 * 1000)).toBe('050471')
    expect(totpCode(RFC_SECRET, 1234567890 * 1000)).toBe('005924')
    expect(totpCode(RFC_SECRET, 2000000000 * 1000)).toBe('279037')
  })

  it('accepts the current code and one step either side, and nothing further', () => {
    const now = 1111111111 * 1000
    expect(verifyTotp(RFC_SECRET, '050471', now)).toEqual({ ok: true, step: 37037037 })
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, now - 30000), now).ok).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, now + 30000), now).ok).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, now - 90000), now).ok).toBe(false)
  })

  it('rejects codes from a step already used', () => {
    const now = 1111111111 * 1000
    expect(verifyTotp(RFC_SECRET, '050471', now, { after: 37037037 }).ok).toBe(false)
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, now + 30000), now, { after: 37037037 }).ok).toBe(true)
  })

  it('ignores spaces and rejects malformed codes', () => {
    const now = 1111111111 * 1000
    expect(verifyTotp(RFC_SECRET, '050 471', now).ok).toBe(true)
    for (const bad of ['', '12345', 'abcdef', undefined, 123456, { $ne: null }]) {
      expect(verifyTotp(RFC_SECRET, bad, now).ok).toBe(false)
    }
  })

  it('makes a fresh base32 secret each time, usable for codes', () => {
    const a = generateSecret()
    const b = generateSecret()
    expect(a).toMatch(/^[A-Z2-7]{32}$/)
    expect(a).not.toBe(b)
    expect(totpCode(a)).toMatch(/^\d{6}$/)
  })

  it('builds an otpauth URL authenticator apps can scan', () => {
    const url = new URL(otpauthUrl({ secret: RFC_SECRET, account: 'sam smith' }))
    expect(url.protocol).toBe('otpauth:')
    expect(url.host).toBe('totp')
    expect(decodeURIComponent(url.pathname)).toBe('/Roommate Dash:sam smith')
    expect(url.searchParams.get('secret')).toBe(RFC_SECRET)
    expect(url.searchParams.get('issuer')).toBe('Roommate Dash')
  })
})
