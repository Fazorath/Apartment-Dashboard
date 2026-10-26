// The Display page's own small client. It deliberately avoids the shared axios instance,
// whose interceptors attach a Roommate's session token and clear sign-in storage on a 401.

const API_BASE = import.meta.env.VITE_API_URL || ''
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
  const response = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) throw new DisplayRequestError(response.status)
  return response.json()
}

export const startPairing = () => send('/api/display/pairing', { method: 'POST' })
export const pollPairing = (pairingSecret) => send('/api/display/pairing/poll', { method: 'POST', body: { pairingSecret } })
export const fetchDisplayChores = (credential) => send('/api/display/chores', { credential })
