import crypto from 'crypto'
import { getPairedDisplayModel, getPendingPairingModel } from '../models/Display.js'
import { hashToken } from './emailVerification.js'

// No 0/O, 1/I/L, so a code read from across the room is entered right
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
export const CODE_TTL_MS = 10 * 60 * 1000
// Once claimed, the TV gets this long to collect its credential
const HANDOVER_TTL_MS = 2 * 60 * 1000

export const BAD_CODE_ERROR = 'That code is wrong, expired or already used. Check the TV for the current code.'

const newCode = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('')
const newSecret = () => crypto.randomBytes(24).toString('base64url')
const newCredential = () => crypto.randomBytes(32).toString('base64url')

// People type spaces or dashes and lower case; none of that changes the code
const normalizeCode = (value) => (typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : '')

export const hashCredential = hashToken

/**
 * Start a pairing for a TV. Returns the Pairing code to show, the secret only that TV
 * knows (to poll with) and when the code expires.
 */
export const startPairing = async () => {
  const PendingPairing = await getPendingPairingModel()
  const pairingSecret = newSecret()
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode()
    try {
      await PendingPairing.create({ codeHash: hashToken(code), secretHash: hashToken(pairingSecret), expiresAt })
      return { code, pairingSecret, expiresAt }
    } catch (error) {
      if (error.code !== 11000) throw error // only a duplicate code is worth another try
    }
  }
  throw new Error('Could not make a Pairing code')
}

/**
 * What the TV sees when it polls: { status: 'pending' }, { status: 'expired' } or
 * { status: 'paired', credential }. The credential is handed over once.
 */
export const pollPairing = async (pairingSecret) => {
  if (typeof pairingSecret !== 'string' || !pairingSecret) return { status: 'expired' }
  const PendingPairing = await getPendingPairingModel()
  const secretHash = hashToken(pairingSecret)

  const handedOver = await PendingPairing.findOneAndDelete({ secretHash, claimed: true, expiresAt: { $gt: new Date() } })
  if (handedOver) return { status: 'paired', credential: handedOver.credential }

  const waiting = await PendingPairing.findOne({ secretHash, claimed: false, expiresAt: { $gt: new Date() } })
  return { status: waiting ? 'pending' : 'expired' }
}

/**
 * A Roommate claims a Pairing code for their Apartment. The new Paired Display replaces
 * any earlier one. Returns false when the code is wrong, expired or already used.
 */
export const claimPairing = async (apartmentCode, username, rawCode) => {
  const code = normalizeCode(rawCode)
  if (code.length !== CODE_LENGTH) return false

  const PendingPairing = await getPendingPairingModel()
  const credential = newCredential()
  const now = new Date()
  const claimed = await PendingPairing.findOneAndUpdate(
    { codeHash: hashToken(code), claimed: false, expiresAt: { $gt: now } },
    { claimed: true, apartmentCode, credential, expiresAt: new Date(now.getTime() + HANDOVER_TTL_MS) }
  )
  if (!claimed) return false

  const PairedDisplay = await getPairedDisplayModel()
  await PairedDisplay.findOneAndUpdate(
    { apartmentCode },
    { apartmentCode, credentialHash: hashCredential(credential), pairedAt: now, pairedBy: username, lastSeen: null },
    { upsert: true }
  )
  return true
}
