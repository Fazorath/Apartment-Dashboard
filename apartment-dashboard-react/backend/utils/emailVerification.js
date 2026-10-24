import crypto from 'crypto'
import { send } from './mailer.js'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// Only this hash is stored, so a database leak doesn't hand out working links
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

/**
 * Give the user a fresh verification token, save it and email the link.
 * Any earlier link stops working.
 */
export const sendVerificationEmail = async (user) => {
  const token = crypto.randomBytes(32).toString('base64url')
  user.emailVerificationTokenHash = hashToken(token)
  user.emailVerificationExpires = new Date(Date.now() + TOKEN_TTL_MS)
  await user.save()

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const link = `${frontendUrl}/verify-email?token=${token}`

  await send({
    to: user.email,
    subject: 'Verify your email for Roommate Dash',
    text: `Hi ${user.username},\n\nConfirm this is your email address by opening the link below. It expires in 24 hours.\n\n${link}\n\nIf you didn't add this address, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(user.username)},</p><p>Confirm this is your email address by opening the link below. It expires in 24 hours.</p><p><a href="${link}">Verify my email</a></p><p>If you didn't add this address, you can ignore this email.</p>`
  })
}

/**
 * Check a token from a verification link. Returns `{ ok: true, user }`, or
 * `{ ok: false, reason }` with reason 'invalid' (unknown, already used) or 'expired'.
 */
export const verifyEmailToken = async (User, token) => {
  if (typeof token !== 'string' || !token) return { ok: false, reason: 'invalid' }

  const user = await User.findOne({ emailVerificationTokenHash: hashToken(token) })
  if (!user) return { ok: false, reason: 'invalid' }
  if (!user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
    return { ok: false, reason: 'expired' }
  }

  user.emailVerified = true
  user.emailVerificationTokenHash = undefined
  user.emailVerificationExpires = undefined
  await user.save()
  return { ok: true, user }
}

const escapeHtml =(value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
