import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, Eye, EyeOff, House, MailX } from 'lucide-react'
import Button from './ui/Button'
import { Field, Input } from './ui/Field'
import { requestPasswordReset, resetPassword } from '../services/api'
import { checkPassword, PASSWORD_HINT } from '../../backend/utils/passwordPolicy.js'

function Shell({ title, children }) {
  return (
    <div className="min-h-screen bg-bg px-4 text-ink">
      <main className="mx-auto grid min-h-screen max-w-[420px] place-items-center py-10">
        <div className="grid w-full gap-5 rounded-sheet border border-line bg-surface px-7 pt-8 pb-7 shadow-card max-sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent"><House size={20} /></div>
            <h1 className="text-[22px] leading-7 font-bold tracking-tight">{title}</h1>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

// The login screen's "Forgot password?" link lands here. Always shows the same
// confirmation, so it never reveals whether an account exists.
export function ForgotPassword() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await requestPasswordReset(identifier)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const backToSignIn = () => navigate('/', { replace: true })

  if (sent) {
    return (
      <Shell title="Check your email">
        <p className="text-muted" role="status">If that account has a verified email, a reset link is on its way. It expires in 1 hour.</p>
        <Button variant="primary" size="lg" onClick={backToSignIn}>Back to sign in</Button>
      </Shell>
    )
  }

  return (
    <Shell title="Reset your password">
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        <Field label="Username or email" htmlFor="forgot-identifier" hint="We’ll email a reset link if the account has a verified email.">
          <Input id="forgot-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </Field>

        {error ? <div className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</div> : null}

        <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!identifier.trim()}>Send reset link</Button>
        <Button variant="ghost" size="lg" onClick={backToSignIn}>Back to sign in</Button>
      </form>
    </Shell>
  )
}

// Opened from the link in a reset email, signed in or not.
export function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reasons, setReasons] = useState([])
  const [done, setDone] = useState(false)
  // A dead link can't be fixed by retyping, so the form gives way to a way out
  const [linkProblem, setLinkProblem] = useState(token ? '' : 'This reset link is missing its token.')

  const hint = !password ? PASSWORD_HINT : (() => {
    const check = checkPassword(password)
    return check.ok ? 'Looks good.' : check.reasons.join(' ')
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setReasons([])
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      const data = err.response?.data
      if (data?.reason === 'weak') {
        setError(data.error)
        setReasons(data.reasons ?? [])
      } else if (data?.reason) {
        setLinkProblem(data.error)
      } else {
        setError(data?.error || 'Something went wrong. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Shell title="Password updated">
        <p className="flex items-start gap-2 text-accent" role="status">
          <BadgeCheck size={18} className="mt-0.5 flex-none" aria-hidden="true" />
          <span>Your password is changed and other devices are signed out. Sign in with the new one.</span>
        </p>
        <Button variant="primary" size="lg" onClick={() => navigate('/', { replace: true })}>Go to sign in</Button>
      </Shell>
    )
  }

  if (linkProblem) {
    return (
      <Shell title="Reset your password">
        <p className="flex items-start gap-2 text-danger" role="alert">
          <MailX size={18} className="mt-0.5 flex-none" aria-hidden="true" />
          <span>{linkProblem}</span>
        </p>
        <Button variant="primary" size="lg" onClick={() => navigate('/forgot-password', { replace: true })}>Request a new link</Button>
      </Shell>
    )
  }

  return (
    <Shell title="Choose a new password">
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        <Field label="New password" htmlFor="reset-password" hint={hint}>
          <div className="relative">
            <Input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute top-1 right-1 grid h-9 w-9 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-ink"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {error ? (
          <div className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
            <p>{error}</p>
            {reasons.length ? (
              <ul className="mt-1 list-disc pl-5">
                {reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" loading={loading} disabled={!password}>Update password</Button>
      </form>
    </Shell>
  )
}
