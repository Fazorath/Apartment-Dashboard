import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { House, Loader2 } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import TwoFactorStep from './TwoFactorStep'
import { Field, Input } from './ui/Field'
import { completeSocialSignUp, finishSocialSignIn } from '../services/api'
import { PROVIDERS, takeExpectedState } from '../lib/socialSignIn'

const MODES = [
  { value: 'join', label: 'Join a home' },
  { value: 'start', label: 'Start a home' },
]

// What each provider sends back when the roommate backs out
const CANCELLED = new Set(['access_denied', 'user_cancelled_authorize'])

// A starting suggestion for the username: the part of the email before the @
const suggestUsername = (email) => (email ? email.split('@')[0].slice(0, 30) : '')

function Card({ title, children }) {
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

// A first-time Google or Apple user picks a home before their account is made
function ChooseHome({ provider, signup, onSignedIn }) {
  const { generateApartmentCode } = useAuth()
  const [mode, setMode] = useState('join')
  const [form, setForm] = useState({ username: suggestUsername(signup.email), apartmentCode: '', apartmentName: '' })
  const [status, setStatus] = useState({ saving: false, error: '' })

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleGenerateCode = async () => {
    const result = await generateApartmentCode()
    if (result.success) setForm((prev) => ({ ...prev, apartmentCode: result.apartmentCode }))
    else setStatus({ saving: false, error: result.error })
  }

  const submit = async (event) => {
    event.preventDefault()
    setStatus({ saving: true, error: '' })
    try {
      const result = await completeSocialSignUp(provider, { signupToken: signup.signupToken, mode, ...form })
      onSignedIn(result)
    } catch (err) {
      setStatus({ saving: false, error: err.response?.data?.error || 'Couldn’t create your account. Try again.' })
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <p className="text-muted">
        {signup.email ? <>Signed in to {PROVIDERS[provider].label} as <b className="font-semibold text-ink">{signup.email}</b>. </> : null}
        Now join your roommates’ home or start a new one.
      </p>

      <Segmented options={MODES} value={mode} onChange={(next) => { setMode(next); setStatus({ saving: false, error: '' }) }} label="Choose an option" stretch />

      {mode === 'start' ? (
        <Field label="Home name" htmlFor="social-home">
          <Input id="social-home" name="apartmentName" value={form.apartmentName} onChange={handleChange} placeholder="e.g. Maple Street" maxLength={50} required />
        </Field>
      ) : null}

      <Field label="Username" htmlFor="social-username" hint="Your roommates see this name.">
        <Input id="social-username" name="username" value={form.username} onChange={handleChange} autoComplete="username" autoCapitalize="none" maxLength={30} required />
      </Field>

      <Field
        label="Home code"
        htmlFor="social-code"
        hint={mode === 'start' ? 'Roommates use this code to join. 4–8 letters or numbers.' : 'Ask a roommate for the 4–8 character code.'}
      >
        <div className="flex gap-2">
          <Input id="social-code" name="apartmentCode" value={form.apartmentCode} onChange={handleChange} className="uppercase tracking-[0.08em]" autoCapitalize="characters" required />
          {mode === 'start' ? <Button variant="secondary" size="lg" onClick={handleGenerateCode}>Generate</Button> : null}
        </div>
      </Field>

      {status.error ? <p className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{status.error}</p> : null}

      <Button type="submit" variant="primary" size="lg" loading={status.saving}>{mode === 'start' ? 'Start home' : 'Join home'}</Button>
    </form>
  )
}

// The provider sends the browser back here with a code, for signing in or for linking
export default function SocialCallback({ provider }) {
  const { label } = PROVIDERS[provider]
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, acceptSession, setEmailStatus, setProviderLinked } = useAuth()
  const [result, setResult] = useState({ phase: 'pending' })
  // Codes are single-use, so StrictMode's second effect run must not send it again
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const expectedState = takeExpectedState(provider)
    const providerError = params.get('error')
    if (providerError) {
      setResult({ phase: 'error', message: CANCELLED.has(providerError) ? `${label} sign-in was cancelled.` : `${label} couldn’t sign you in. Try again.` })
      return
    }
    if (!params.get('code') || !expectedState || params.get('state') !== expectedState) {
      setResult({ phase: 'error', message: `This ${label} sign-in wasn’t started here, or has already been used. Try again.` })
      return
    }

    finishSocialSignIn(provider, params.get('code'), params.get('state'))
      .then((data) => {
        if (data.status === 'signed-in') {
          acceptSession(data.token, data.user)
          navigate('/', { replace: true })
        } else if (data.status === 'two-factor') {
          setResult({ phase: 'two-factor', twoFactorToken: data.twoFactorToken })
        } else if (data.status === 'linked') {
          setProviderLinked(provider, true)
          setEmailStatus({ email: data.user.email, emailVerified: data.user.emailVerified })
          navigate('/settings', { replace: true })
        } else {
          setResult({ phase: 'needs-apartment', signup: data })
        }
      })
      .catch((err) => {
        setResult({ phase: 'error', message: err.response?.data?.error || `${label} sign-in failed. Try again.` })
      })
  }, [params, navigate, acceptSession, setEmailStatus, setProviderLinked, provider, label])

  if (result.phase === 'two-factor') {
    return (
      <Card title="Two-factor sign-in">
        <TwoFactorStep
          twoFactorToken={result.twoFactorToken}
          // Google and Apple sign-in keep the session across restarts, as acceptSession does
          rememberMe
          onExpired={(message) => setResult({ phase: 'error', message })}
          onBack={() => navigate('/', { replace: true })}
          onSignedIn={() => navigate('/', { replace: true })}
        />
      </Card>
    )
  }

  if (result.phase === 'needs-apartment') {
    return (
      <Card title="Choose your home">
        <ChooseHome
          provider={provider}
          signup={result.signup}
          onSignedIn={(data) => {
            acceptSession(data.token, data.user)
            navigate('/', { replace: true })
          }}
        />
      </Card>
    )
  }

  return (
    <Card title={`Continue with ${label}`}>
      <div role="status" aria-live="polite">
        {result.phase === 'pending' ? (
          <p className="flex items-center gap-2 text-muted"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Finishing sign-in…</p>
        ) : (
          <p className="text-danger">{result.message}</p>
        )}
      </div>
      {result.phase === 'error' ? (
        <Button variant="primary" size="lg" onClick={() => navigate(user ? '/settings' : '/', { replace: true })}>
          {user ? 'Back to settings' : 'Back to sign in'}
        </Button>
      ) : null}
    </Card>
  )
}
