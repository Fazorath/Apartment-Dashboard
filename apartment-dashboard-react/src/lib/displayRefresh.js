// How often the Display reads its Chores
export const REFRESH_MS = 60 * 1000
// The local hour the Display reloads itself, to pick up a new app version
export const RELOAD_HOUR = 4

const RETRY_FIRST_MS = 5 * 1000

// Wait before retry number `attempt` (1 for the first retry after a failure): doubles, up to a normal refresh
export const retryDelay = (attempt) => Math.min(RETRY_FIRST_MS * 2 ** (attempt - 1), REFRESH_MS)

// Time from `now` to the next local RELOAD_HOUR:00
export const msUntilNextReload = (now = new Date()) => {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), RELOAD_HOUR)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next - now
}
