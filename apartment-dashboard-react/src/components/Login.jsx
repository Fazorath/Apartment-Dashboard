import { useState } from 'react'
import { Eye, EyeOff, House } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Field, Input } from './ui/Field'

const MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'join', label: 'Join a home' },
  { value: 'start', label: 'Start a home' },
]

const SUBMIT_LABEL = { signin: 'Sign in', join: 'Join home', start: 'Start home' }

const Login = () => {
  const [mode, setMode] = useState('signin')
  const [formData, setFormData] = useState({ username: '', password: '', apartmentCode: '', apartmentName: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const { login, register, createApartment, generateApartmentCode } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { username, password, apartmentCode, apartmentName, email } = formData
      const result = mode === 'signin'
        ? await login(username, password, apartmentCode, rememberMe)
        : mode === 'start'
          ? await createApartment(username, password, apartmentCode, apartmentName, email)
          : await register(username, password, apartmentCode, email)
      // On success AuthContext sets the user and App swaps in the dashboard.
      if (!result.success) setError(result.error)
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

  const switchMode = (next) => {
    setMode(next)
    setError('')
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

          <Field label="Password" htmlFor="login-password" hint={mode === 'signin' ? null : 'At least 6 characters.'}>
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
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Keep me signed in
            </label>
          ) : (
            <Field label="Email" htmlFor="login-email" optional>
              <Input id="login-email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" />
            </Field>
          )}

          {error ? <p className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}

          <Button type="submit" variant="primary" size="lg" loading={loading}>{SUBMIT_LABEL[mode]}</Button>
        </form>
      </main>
    </div>
  )
}

export default Login
