import { startGoogleSignIn } from '../services/api'

// The state for the round trip in progress. The callback page only finishes a sign-in
// this tab started, so a link someone else crafted can't sign you in or link their account.
const STATE_KEY = 'googleOAuthState'

/**
 * Send the browser to Google to sign in ('signin') or to link Google to the
 * signed-in account ('link'). Resolves with an error message if it can't start.
 */
export async function beginGoogleSignIn(intent) {
  try {
    const { url, state } = await startGoogleSignIn(intent)
    sessionStorage.setItem(STATE_KEY, state)
    window.location.assign(url)
    return null
  } catch (err) {
    return err.response?.data?.error || 'Couldn’t reach Google. Try again.'
  }
}

// The state this tab sent to Google, cleared so it can be used once
export function takeExpectedState() {
  const state = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return state
}
