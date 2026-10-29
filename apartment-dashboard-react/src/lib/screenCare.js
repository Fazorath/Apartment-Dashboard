// Looking after a screen that is on all day: night dim and burn-in shifting.

export const NIGHT_START_HOUR = 23
export const NIGHT_END_HOUR = 7
// The layout never moves further than this from its resting place, which the page padding absorbs
export const SHIFT_PX = 6

// True from 23:00 up to 07:00 local time
export function isNight(now) {
  const hour = now.getHours()
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

const OFFSETS = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

// Where the layout sits on a given step: a walk around the resting place, a different spot every step
export function shiftFor(step) {
  const [x, y] = OFFSETS[((step % OFFSETS.length) + OFFSETS.length) % OFFSETS.length]
  return { x: x * SHIFT_PX, y: y * SHIFT_PX }
}
