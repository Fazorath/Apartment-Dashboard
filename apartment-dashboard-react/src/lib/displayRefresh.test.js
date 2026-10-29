import { describe, expect, it } from 'vitest'
import { msUntilNextReload, retryDelay, REFRESH_MS } from './displayRefresh'

describe('retryDelay', () => {
  it('backs off from a few seconds and never waits longer than a normal refresh', () => {
    expect(retryDelay(1)).toBe(5000)
    expect(retryDelay(2)).toBe(10000)
    expect(retryDelay(3)).toBe(20000)
    expect(retryDelay(4)).toBe(40000)
    expect(retryDelay(5)).toBe(REFRESH_MS)
    expect(retryDelay(50)).toBe(REFRESH_MS)
  })
})

describe('msUntilNextReload', () => {
  const HOUR = 60 * 60 * 1000
  it('aims for 4 a.m. later the same day', () => {
    expect(msUntilNextReload(new Date(2026, 9, 20, 1, 0))).toBe(3 * HOUR)
  })
  it('aims for 4 a.m. tomorrow once it has passed', () => {
    expect(msUntilNextReload(new Date(2026, 9, 20, 18, 30))).toBe(9.5 * HOUR)
    expect(msUntilNextReload(new Date(2026, 9, 20, 4, 0))).toBe(24 * HOUR)
  })
})
