// The one password policy, applied wherever a password is set (join, create
// apartment, later reset) and imported by the sign-up form for its hints.
// Login never calls it, so older shorter passwords keep working.
import { COMMON_PASSWORDS } from './commonPasswords.js'

export const MIN_PASSWORD_LENGTH = 10
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters, not a common password, and not your username.`

// Returns every rule the password breaks, so the caller can show them all at once.
export function checkPassword(password = '', { username = '' } = {}) {
  const reasons = []
  const lower = password.toLowerCase()
  if (password.length < MIN_PASSWORD_LENGTH) reasons.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  if (COMMON_PASSWORDS.has(lower)) reasons.push('This password is too common.')
  if (username.trim() && lower === username.trim().toLowerCase()) reasons.push('Your password can’t be your username.')
  return { ok: reasons.length === 0, reasons }
}
