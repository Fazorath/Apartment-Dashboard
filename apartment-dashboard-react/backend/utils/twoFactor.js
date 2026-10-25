import crypto from 'crypto'
import QRCode from 'qrcode'
import { hashToken } from './emailVerification.js'
import { generateSecret, otpauthUrl, verifyTotp } from './totp.js'

const RECOVERY_CODE_COUNT = 10
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

// Codes are shown as xxxxx-xxxxx; typing them with spaces, dashes or capitals still works
const normalizeRecoveryCode = (code) => code.replace(/[\s-]/g, '').toLowerCase()

const newRecoveryCode = () => {
  const chars = Array.from(crypto.randomBytes(10), (byte) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length])
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`
}

/**
 * Start turning on 2FA: save a new pending secret (replacing any earlier unconfirmed one)
 * and return it with a QR code to scan. 2FA stays off until `confirmTwoFactor`.
 */
export const startTwoFactorSetup = async (user) => {
  const secret = generateSecret()
  user.twoFactorPendingSecret = secret
  await user.save()

  const url = otpauthUrl({ secret, account: user.username })
  return { secret, otpauthUrl: url, qrCode: await QRCode.toDataURL(url) }
}

/**
 * Finish turning on 2FA with a code from the app. Returns `{ ok: true, recoveryCodes }`
 * (the only time they're ever shown; only hashes are stored), or `{ ok: false, reason }`
 * with reason 'enabled' (already on), 'no-setup' or 'invalid'.
 */
export const confirmTwoFactor = async (user, code) => {
  if (user.twoFactorEnabled) return { ok: false, reason: 'enabled' }
  if (!user.twoFactorPendingSecret) return { ok: false, reason: 'no-setup' }

  const check = verifyTotp(user.twoFactorPendingSecret, code)
  if (!check.ok) return { ok: false, reason: 'invalid' }

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  user.twoFactorEnabled = true
  user.twoFactorSecret = user.twoFactorPendingSecret
  user.twoFactorPendingSecret = undefined
  user.twoFactorLastStep = check.step
  user.twoFactorRecoveryCodeHashes = recoveryCodes.map((c) => hashToken(normalizeRecoveryCode(c)))
  await user.save()
  return { ok: true, recoveryCodes }
}

/**
 * Check a second-factor code: a code from the app, or an unused recovery code.
 * Each is claimed atomically, so the same code can't be used twice, even by two
 * requests at once. Returns `{ ok: true, method: 'totp' | 'recovery' }` or `{ ok: false }`.
 */
export const checkSecondFactor = async (User, user, code) => {
  if (!user.twoFactorEnabled || typeof code !== 'string') return { ok: false }

  const totp = verifyTotp(user.twoFactorSecret, code, Date.now(), { after: user.twoFactorLastStep ?? -1 })
  if (totp.ok) {
    const claim = await User.updateOne(
      { _id: user._id, $or: [{ twoFactorLastStep: { $exists: false } }, { twoFactorLastStep: { $lt: totp.step } }] },
      { $set: { twoFactorLastStep: totp.step } }
    )
    return claim.modifiedCount === 1 ? { ok: true, method: 'totp' } : { ok: false }
  }

  const hash = hashToken(normalizeRecoveryCode(code))
  const claim = await User.updateOne(
    { _id: user._id, twoFactorRecoveryCodeHashes: hash },
    { $pull: { twoFactorRecoveryCodeHashes: hash } }
  )
  return claim.modifiedCount === 1 ? { ok: true, method: 'recovery' } : { ok: false }
}

/**
 * Turn 2FA off after checking a code (from the app or a recovery code).
 * Returns `{ ok: true }` or `{ ok: false, reason }` with reason 'not-enabled' or 'invalid'.
 */
export const disableTwoFactor = async (User, user, code) => {
  if (!user.twoFactorEnabled) return { ok: false, reason: 'not-enabled' }
  if (!(await checkSecondFactor(User, user, code)).ok) return { ok: false, reason: 'invalid' }

  await User.updateOne(
    { _id: user._id },
    {
      $set: { twoFactorEnabled: false },
      $unset: { twoFactorSecret: 1, twoFactorPendingSecret: 1, twoFactorLastStep: 1, twoFactorRecoveryCodeHashes: 1 }
    }
  )
  return { ok: true }
}
