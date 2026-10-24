import { describe, it, expect } from 'vitest'
import { checkPassword } from '../utils/passwordPolicy.js'

describe('password policy', () => {
  it('accepts a long, uncommon password that is not the username', () => {
    expect(checkPassword('maple-street-kettle', { username: 'sam' })).toEqual({ ok: true, reasons: [] })
  })

  it('rejects a password shorter than 10 characters', () => {
    expect(checkPassword('Kettle#42', { username: 'sam' })).toEqual({
      ok: false,
      reasons: ['Use at least 10 characters.']
    })
  })

  it('rejects a common password regardless of case', () => {
    expect(checkPassword('Password123', { username: 'sam' })).toEqual({
      ok: false,
      reasons: ['This password is too common.']
    })
    expect(checkPassword('QWERTYUIOP', { username: 'sam' }).ok).toBe(false)
  })

  it('rejects a password that matches the username, ignoring case', () => {
    expect(checkPassword('SamTheRoommate', { username: 'samtheroommate' })).toEqual({
      ok: false,
      reasons: ['Your password can’t be your username.']
    })
  })

  it('lists every reason a password fails', () => {
    expect(checkPassword('sam', { username: 'sam' }).reasons).toEqual([
      'Use at least 10 characters.',
      'Your password can’t be your username.'
    ])
  })

  it('treats a missing password as too short', () => {
    expect(checkPassword(undefined).reasons).toEqual(['Use at least 10 characters.'])
  })

  it('rejects a password that is not text instead of throwing', () => {
    expect(checkPassword(12345678901, { username: 'sam' })).toEqual({ ok: false, reasons: ['Password must be text.'] })
    expect(checkPassword(null).ok).toBe(false)
    expect(checkPassword('maple-street-kettle', { username: 42 }).ok).toBe(true)
  })
})
