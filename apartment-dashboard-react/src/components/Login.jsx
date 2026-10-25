import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, House } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Field, Input } from './ui/Field'
import GoogleMark from './ui/GoogleMark'
import { beginGoogleSignIn } from '../lib/googleSignIn'
import { checkPassword, PASSWORD_HINT } from '../../backend/utils/passwordPolicy.js'

const MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'join', label: 'Join a home' },
  { value: 'start', label: 'Start a home' },
]

const SUBMIT_LABEL = { signin: 'Sign in', join: 'Join home', start: 'Start home' }

// Live hint for a new password, from the same policy the server applies.
const passwordHint = (password, username) => {
  if (!password) return PASSWORD_HINT
  const { ok, reasons } = checkPassword(password, { username })
  return ok ? 'Looks good.' : reasons.join(' ')
}

const Login = () => {
  const [mode, setMode] = useState('signin')
  const [formData, setFormData] = useState({ username: '', password: '', apartmentCode: '', apartmentName: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorReasons, setErrorReasons] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { login, register, createApartment, generateApartmentCode } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrorReasons([])
    try {
      const { username, password, apartmentCode, apartmentName, email } = formData
      const result = mode === 'signin'
        ? await login(username, password, apartmentCode, rememberMe)
        : mode === 'start'
          ? await createApartment(username, password, apartmentCode, apartmentName, email)
          : await register(username, password, apartmentCode, email)
      // On success AuthContext sets the user and App swaps in the dashboard.
      if (!result.success) {
        setError(result.error)
        setErrorReasons(result.reasons ?? [])
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleGenerateCode = async () => {
    const result = await generateApartmentCode()
    if (result.success) setFormData((prev) => ({ ...prev, apartmentCode: result.apartmentCode }))
    else setError(result.error)
  }

  // New Google users pick their home after Google, so this works from any tab
  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    setErrorReasons([])
    const failure = await beginGoogleSignIn('signin')
    if (failure) {
      setError(failure)
      setGoogleLoading(false)
    }
  }

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setErrorReasons([])
  }

  return (
    <div className="min-h-screen bg-bg px-4 text-ink">
      <main className="mx-auto grid min-h-screen max-w-[420px] place-items-center py-10">
        <form onSubmit={handleSubmit} className="grid w-full gap-5 rounded-sheet border border-line bg-surface px-7 pt-8 pb-7 shadow-card max-sm:px-5" noValidate>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent"><House size={20} /></div>
            <div>
              <h1 className="text-[26px] leading-8 font-bold tracking-tight">Roommate Dash</h1>
              <p className="text-muted">Shared chores, without the reminders.</p>
            </div>
          </div>

          <Segmented options={MODES} value={mode} onChange={switchMode} label="Choose an option" stretch />

          {mode === 'start' ? (
            <Field label="Home name" htmlFor="login-home">
              <Input id="login-home" name="apartmentName" value={formData.apartmentName} onChange={handleChange} placeholder="e.g. Maple Street" maxLength={50} required />
            </Field>
          ) : null}

          <Field label="Username" htmlFor="login-username">
            <Input id="login-username" name="username" value={formData.username} onChange={handleChange} autoComplete="username" autoCapitalize="none" required />
          </Field>

          <Field label="Password" htmlFor="login-password" hint={mode === 'signin' ? null : passwordHint(formData.password, formData.username)}>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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

          <Field
            label="Home code"
            htmlFor="login-code"
            hint={mode === 'start' ? 'Roommates use this code to join. 4–8 letters or numbers.' : mode === 'join' ? 'Ask a roommate for the 4–8 character code.' : null}
          >
            <div className="flex gap-2">
              <Input id="login-code" name="apartmentCode" value={formData.apartmentCode} onChange={handleChange} className="uppercase tracking-[0.08em]" autoCapitalize="characters" required={mode !== 'signin'} />
              {mode === 'start' ? <Button variant="secondary" size="lg" onClick={handleGenerateCode}>Generate</Button> : null}
            </div>
          </Field>

          {mode === 'signin' ? (
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                Keep me signed in
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-accent hover:underline">Forgot password?</Link>
            </div>
          ) : (
            <Field label="Email" htmlFor="login-email" optional>
              <Input id="login-email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" />
            </Field>
          )}

          {error ? (
            <div className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">
              <p>{error}</p>
              {errorReasons.length ? (
                <ul className="mt-1 list-disc pl-5">
                  {errorReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" variant="primary" size="lg" loading={loading}>{SUBMIT_LABEL[mode]}</Button>

          <div className="flex items-center gap-3 text-xs text-subtle" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="secondary" size="lg" onClick={handleGoogle} loading={googleLoading}>
            {googleLoading ? null : <GoogleMark />} Continue with Google
          </Button>
        </form>
      </main>
    </div>
  )
}

export default Login
