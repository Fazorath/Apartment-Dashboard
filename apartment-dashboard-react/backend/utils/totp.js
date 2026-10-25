import crypto from 'crypto'

// RFC 6238 TOTP with the settings every authenticator app defaults to:
// SHA-1, 6 digits, 30-second steps
const STEP_MS = 30 * 1000
const DIGITS = 6
// Allow one step of clock drift either way
const WINDOW = 1
const ISSUER = 'Roommate Dash'
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const base32Encode = (buffer) => {
  let bits = ''
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i < bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]
  return out
}

const base32Decode = (text) => {
  let bits = ''
  for (const char of text.replace(/=+$/, '').toUpperCase()) bits += BASE32.indexOf(char).toString(2).padStart(5, '0')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

const codeForStep = (secret, step) => {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const value = hmac.readUInt32BE(offset) & 0x7fffffff
  return String(value % 10 ** DIGITS).padStart(DIGITS, '0')
}

/**
 * A new random secret (160 bits, base32), as authenticator apps expect
 */
export const generateSecret = () => base32Encode(crypto.randomBytes(20))

/**
 * The code an authenticator app shows for this secret at `now` (ms)
 */
export const totpCode = (secret, now = Date.now()) => codeForStep(secret, Math.floor(now / STEP_MS))

/**
 * Check a code typed by the user. Returns `{ ok: true, step }` with the matched time
 * step, or `{ ok: false }`. Pass `after` (the last step used) so a code can't be replayed.
 */
export const verifyTotp = (secret, code, now = Date.now(), { after = -1 } = {}) => {
  if (typeof code !== 'string') return { ok: false }
  const digits = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(digits)) return { ok: false }

  const current = Math.floor(now / STEP_MS)
  for (let step = current - WINDOW; step <= current + WINDOW; step++) {
    if (step <= after) continue
    const expected = Buffer.from(codeForStep(secret, step))
    if (crypto.timingSafeEqual(expected, Buffer.from(digits))) return { ok: true, step }
  }
  return { ok: false }
}

/**
 * The otpauth:// URL that authenticator apps read from a QR code
 */
export const otpauthUrl = ({ secret, account }) => {
  const label = encodeURIComponent(`${ISSUER}:${account}`)
  const params = new URLSearchParams({ secret, issuer: ISSUER, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_MS / 1000) })
  return `otpauth://totp/${label}?${params}`
}
