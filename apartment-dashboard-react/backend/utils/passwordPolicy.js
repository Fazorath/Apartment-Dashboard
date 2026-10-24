// The one password policy, applied wherever a password is set (join, create
// apartment, later reset) and imported by the sign-up form for its hints.
// Login never calls it, so older shorter passwords keep working.
import { COMMON_PASSWORDS } from './commonPasswords.js'

export const MIN_PASSWORD_LENGTH = 10
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, not a common password, and not your username.`

// Returns every rule the password breaks, so the caller can show them all at once.
// Request bodies are JSON, so anything that isn't a string is rejected rather than thrown on.
export function checkPassword(password, { username } = {}) {
  password ??= ''
  if (typeof password !== 'string') return { ok: false, reasons: ['Password must be text.'] }
  const name = typeof username === 'string' ? username.trim().toLowerCase() : ''

  const reasons = []
  const lower = password.toLowerCase()
  if (password.length < MIN_PASSWORD_LENGTH) reasons.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  if (COMMON_PASSWORDS.has(lower)) reasons.push('This password is too common.')
  if (name && lower === name) reasons.push('Your password can’t be your username.')
  return { ok: reasons.length === 0, reasons }
}
