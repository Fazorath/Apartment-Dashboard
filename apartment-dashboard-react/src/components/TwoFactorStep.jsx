import { useState } from 'react'
import useAuth from '../hooks/useAuth'
import Button from './ui/Button'
import { Field, Input } from './ui/Field'

// Second sign-in step when 2FA is on, after a password or Google. Calls onExpired
// if the first step has to be done again, and onSignedIn once the session starts.
export default function TwoFactorStep({ twoFactorToken, rememberMe, onExpired, onBack, onSignedIn }) {
  const { completeTwoFactorLogin } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    // On success AuthContext sets the user and App swaps in the dashboard.
    const result = await completeTwoFactorLogin(twoFactorToken, code, rememberMe)
    if (result.success) return onSignedIn?.()
    if (!result.success && result.reason === 'expired') return onExpired(result.error)
    if (!result.success) {
      setError(result.error)
      setCode('')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <Field label="Verification code" htmlFor="login-2fa-code" hint="Enter the 6-digit code from your authenticator app. Lost your phone? Use one of your recovery codes.">
        <Input
          id="login-2fa-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          className="text-lg tracking-[0.12em] tabular-nums"
          autoFocus
          required
        />
      </Field>

      {error ? <div className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</div> : null}

      <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!code.trim()}>Verify</Button>
      <Button variant="ghost" size="lg" onClick={onBack}>Back</Button>
    </form>
  )
}
