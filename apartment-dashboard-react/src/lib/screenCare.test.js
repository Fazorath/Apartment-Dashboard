import { describe, expect, it } from 'vitest'
import { SHIFT_PX, isNight, shiftFor } from './screenCare'

const at = (hour, minute = 0) => new Date(2026, 9, 20, hour, minute)

describe('isNight', () => {
  it('is dim from 23:00 up to 07:00 local time', () => {
    expect(isNight(at(23, 0))).toBe(true)
    expect(isNight(at(0, 0))).toBe(true)
    expect(isNight(at(6, 59))).toBe(true)
  })

  it('is full brightness from 07:00 up to 23:00', () => {
    expect(isNight(at(7, 0))).toBe(false)
    expect(isNight(at(12, 0))).toBe(false)
    expect(isNight(at(22, 59))).toBe(false)
  })
})

describe('shiftFor', () => {
  it('stays within a few pixels on both axes for every step', () => {
    for (let step = 0; step < 500; step++) {
      const { x, y } = shiftFor(step)
      expect(Math.abs(x)).toBeLessThanOrEqual(SHIFT_PX)
      expect(Math.abs(y)).toBeLessThanOrEqual(SHIFT_PX)
    }
  })

  it('moves on every step', () => {
    for (let step = 0; step < 50; step++) {
      expect(shiftFor(step)).not.toEqual(shiftFor(step + 1))
    }
  })
})
