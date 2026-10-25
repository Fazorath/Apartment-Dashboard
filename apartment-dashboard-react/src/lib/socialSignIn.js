import { startSocialSignIn } from '../services/api'

// What each provider's buttons and messages call it
export const PROVIDERS = {
  google: { label: 'Google' },
  apple: { label: 'Apple' },
}

// The state for the round trip in progress, per provider. The callback page only finishes a
// sign-in this tab started, so a link someone else crafted can't sign you in or link their account.
const stateKey = (provider) => `${provider}OAuthState`

/**
 * Send the browser to the provider to sign in ('signin') or to link it to the
 * signed-in account ('link'). Resolves with an error message if it can't start.
 */
export async function beginSocialSignIn(provider, intent) {
  try {
    const { url, state } = await startSocialSignIn(provider, intent)
    sessionStorage.setItem(stateKey(provider), state)
    window.location.assign(url)
    return null
  } catch (err) {
    return err.response?.data?.error || `Couldn’t reach ${PROVIDERS[provider].label}. Try again.`
  }
}

// The state this tab sent to the provider, cleared so it can be used once
export function takeExpectedState(provider) {
  const state = sessionStorage.getItem(stateKey(provider))
  sessionStorage.removeItem(stateKey(provider))
  return state
}
