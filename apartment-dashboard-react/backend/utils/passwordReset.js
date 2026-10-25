import crypto from 'crypto'
import { send } from './mailer.js'
import { hashToken } from './emailVerification.js'
import { checkPassword } from './passwordPolicy.js'

const TOKEN_TTL_MS = 60 * 60 * 1000

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])

/**
 * Give the user a fresh reset token, save it and email the link.
 * Any earlier reset link stops working.
 */
export const sendPasswordResetEmail = async (user) => {
  const token = crypto.randomBytes(32).toString('base64url')
  user.passwordResetTokenHash = hashToken(token)
  user.passwordResetExpires = new Date(Date.now() + TOKEN_TTL_MS)
  await user.save()

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const link = `${frontendUrl}/reset-password?token=${token}`

  await send({
    to: user.email,
    subject: 'Reset your Roommate Dash password',
    text: `Hi ${user.username},\n\nSomeone asked to reset the password for your account. Open the link below to choose a new one. It expires in 1 hour and works once.\n\n${link}\n\nIf this wasn't you, you can ignore this email; your password stays the same.`,
    html: `<p>Hi ${escapeHtml(user.username)},</p><p>Someone asked to reset the password for your account. Open the link below to choose a new one. It expires in 1 hour and works once.</p><p><a href="${link}">Reset my password</a></p><p>If this wasn't you, you can ignore this email; your password stays the same.</p>`
  })
}

/**
 * Email a reset link to every account matching the username or email, but only
 * where the email is verified, so a link never goes to an address nobody proved.
 */
export const requestPasswordReset = async (User, identifier) => {
  const value = identifier.trim()
  const users = await User.find({
    emailVerified: true,
    $or: [{ username: value }, { email: value.toLowerCase() }]
  })
  for (const user of users) await sendPasswordResetEmail(user)
}

/**
 * Set a new password from a reset link. Returns `{ ok: true, user }`, or
 * `{ ok: false, reason }` with reason 'invalid' (unknown, already used), 'expired'
 * or 'weak' (with `reasons` from the password policy; the link stays usable).
 */
export const resetPasswordWithToken = async (User, token, password) => {
  if (typeof token !== 'string' || !token) return { ok: false, reason: 'invalid' }

  const user = await User.findOne({ passwordResetTokenHash: hashToken(token) })
  if (!user) return { ok: false, reason: 'invalid' }
  if (!user.passwordResetExpires || user.passwordResetExpires <= new Date()) {
    return { ok: false, reason: 'expired' }
  }

  const check = checkPassword(password, { username: user.username })
  if (!check.ok) return { ok: false, reason: 'weak', reasons: check.reasons }

  user.password = password
  user.passwordResetTokenHash = undefined
  user.passwordResetExpires = undefined
  user.passwordChangedAt = new Date()
  await user.save()
  return { ok: true, user }
}
