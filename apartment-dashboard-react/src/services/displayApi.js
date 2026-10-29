// The Display page's own small client. It deliberately avoids the shared axios instance,
// whose interceptors attach a Roommate's session token and clear sign-in storage on a 401.

const API_BASE = import.meta.env.VITE_API_URL || ''
const REQUEST_TIMEOUT_MS = 15 * 1000
const STORAGE_KEY = 'displayCredential'

// Held here when storage is unavailable (private mode, blocked cookies), so the page still works
let memoryCredential = null

export const readCredential = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || memoryCredential
  } catch {
    return memoryCredential
  }
}

export const saveCredential = (credential) => {
  memoryCredential = credential
  try {
    window.localStorage.setItem(STORAGE_KEY, credential)
  } catch {
    // Kept in memory only
  }
}

export const clearCredential = () => {
  memoryCredential = null
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored to clear
  }
}

export class DisplayRequestError extends Error {
  constructor(status) {
    super(`Display request failed (${status})`)
    this.status = status
  }
}

const send = async (path, { method = 'GET', body, credential } = {}) => {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (credential) headers.Authorization = `Bearer ${credential}`
  // A request that stalls on flaky Wi-Fi must fail, or the Display would freeze on old Chores with no offline note
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) throw new DisplayRequestError(response.status)
  return response.json()
}

export const startPairing = () => send('/api/display/pairing', { method: 'POST' })
export const pollPairing = (pairingSecret) => send('/api/display/pairing/poll', { method: 'POST', body: { pairingSecret } })
export const fetchDisplayChores = (credential) => send('/api/display/chores', { credential })
