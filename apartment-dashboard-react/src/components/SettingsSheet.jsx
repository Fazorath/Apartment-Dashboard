import { useId, useState } from 'react'
import { BadgeCheck, Check, Copy, LogOut, MailWarning, ShieldCheck } from 'lucide-react'
import Sheet, { SheetBody, SheetHeader } from './ui/Sheet'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Field, Input } from './ui/Field'
import useTheme, { THEME_OPTIONS } from '../hooks/useTheme'
import useAuth from '../hooks/useAuth'
import { confirmTwoFactor, disableTwoFactor, resendVerificationEmail, setupTwoFactor, updateApartmentName, updateEmail } from '../services/api'

function HomeNameForm({ initialName, onSaved }) {
  const [name, setName] = useState(initialName)
  const [state, setState] = useState({ saving: false, error: '', saved: false })
  const changed = name.trim() !== initialName && name.trim().length >= 2

  const save = async (event) => {
    event.preventDefault()
    if (!changed) return
    setState({ saving: true, error: '', saved: false })
    try {
      const result = await updateApartmentName(name.trim())
      onSaved(result.apartmentName)
      setState({ saving: false, error: '', saved: true })
    } catch (err) {
      setState({ saving: false, error: err.response?.data?.error || 'Couldn’t rename your home. Try again.', saved: false })
    }
  }

  return (
    <form onSubmit={save} className="grid gap-2">
      <Field label="Home name" htmlFor="settings-home-name" error={state.error} hint={state.saved ? 'Saved.' : 'At least 2 characters.'}>
        <div className="flex gap-2">
          <Input id="settings-home-name" value={name} maxLength={50} onChange={(e) => { setName(e.target.value); setState((s) => ({ ...s, saved: false })) }} />
          <Button type="submit" variant="secondary" size="lg" disabled={!changed} loading={state.saving}>Save</Button>
        </div>
      </Field>
    </form>
  )
}

function EmailForm({ email, emailVerified, onSaved }) {
  const [value, setValue] = useState(email)
  const [state, setState] = useState({ saving: false, error: '' })
  const [resend, setResend] = useState({ sending: false, message: '', error: '' })
  const changed = value.trim().toLowerCase() !== email && value.trim().length > 0

  const save = async (event) => {
    event.preventDefault()
    if (!changed) return
    setState({ saving: true, error: '' })
    setResend({ sending: false, message: '', error: '' })
    try {
      const result = await updateEmail(value.trim())
      onSaved(result.user)
      setValue(result.user.email)
      setState({ saving: false, error: '' })
      setResend({ sending: false, message: `We sent a link to ${result.user.email}.`, error: '' })
    } catch (err) {
      setState({ saving: false, error: err.response?.data?.error || 'Couldn’t save your email. Try again.' })
    }
  }

  const resendLink = async () => {
    setResend({ sending: true, message: '', error: '' })
    try {
      await resendVerificationEmail()
      setResend({ sending: false, message: `We sent a new link to ${email}.`, error: '' })
    } catch (err) {
      setResend({ sending: false, message: '', error: err.response?.data?.error || 'Couldn’t send the email. Try again.' })
    }
  }

  return (
    <div className="grid gap-2">
      <form onSubmit={save}>
        <Field label="Email" htmlFor="settings-email" error={state.error} hint={email ? null : 'Add an email so you can recover your account.'}>
          <div className="flex gap-2">
            <Input id="settings-email" type="email" autoComplete="email" placeholder="you@example.com" value={value} onChange={(e) => setValue(e.target.value)} />
            <Button type="submit" variant="secondary" size="lg" disabled={!changed} loading={state.saving}>Save</Button>
          </div>
        </Field>
      </form>
      {email && emailVerified ? (
        <p className="flex items-center gap-1.5 text-xs text-accent"><BadgeCheck size={14} aria-hidden="true" /> Verified</p>
      ) : null}
      {email && !emailVerified ? (
        <div className="grid gap-2 rounded-ctl bg-warning-soft px-3 py-2.5 text-xs text-warning" role="status">
          <p className="flex items-center gap-1.5 font-medium"><MailWarning size={14} aria-hidden="true" /> Not verified yet</p>
          <p className="text-muted">{resend.message || 'Open the link we emailed you to confirm this address.'}</p>
          {resend.error ? <p className="text-danger" role="alert">{resend.error}</p> : null}
          <Button variant="secondary" className="justify-self-start" onClick={resendLink} loading={resend.sending}>Resend email</Button>
        </div>
      ) : null}
    </div>
  )
}

const errorFrom = (err, fallback) => err.response?.data?.error || fallback

const TwoFactorOn = () => (
  <p className="flex items-center gap-1.5 text-sm font-medium text-accent"><ShieldCheck size={16} aria-hidden="true" /> Two-factor login is on</p>
)

// Two-factor login: off → setup (scan + confirm) → recovery codes (shown once) → on → turn off with a code
function TwoFactorSection({ enabled, onChange }) {
  const [step, setStep] = useState('idle')
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [state, setState] = useState({ busy: false, error: '' })
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setStep('idle')
    setSetup(null)
    setCode('')
    setState({ busy: false, error: '' })
  }

  const run = async (action, fallback) => {
    setState({ busy: true, error: '' })
    try {
      await action()
      setState({ busy: false, error: '' })
    } catch (err) {
      setState({ busy: false, error: errorFrom(err, fallback) })
    }
  }

  const start = () => run(async () => {
    setSetup(await setupTwoFactor())
    setStep('setup')
  }, 'Couldn’t start setup. Try again.')

  const confirmSetup = (event) => {
    event.preventDefault()
    run(async () => {
      const result = await confirmTwoFactor(code)
      setRecoveryCodes(result.recoveryCodes)
      setSetup(null)
      setCode('')
      setStep('codes')
      onChange(true)
    }, 'Couldn’t turn on two-factor login. Try again.')
  }

  const turnOff = (event) => {
    event.preventDefault()
    run(async () => {
      await disableTwoFactor(code)
      reset()
      onChange(false)
    }, 'Couldn’t turn off two-factor login. Try again.')
  }

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const el = document.getElementById('settings-recovery-codes')
      if (el) window.getSelection().selectAllChildren(el)
    }
  }

  const codeInput = (id, label) => (
    <Field label={label} htmlFor={id} error={state.error}>
      <Input id={id} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} className="tracking-[0.12em] tabular-nums" autoFocus />
    </Field>
  )

  if (step === 'codes') {
    return (
      <div className="grid gap-3">
        <TwoFactorOn />
        <p className="text-sm text-muted">Save these recovery codes somewhere safe. Each one signs you in once if you lose your phone. You won’t see them again.</p>
        <ul id="settings-recovery-codes" className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-ctl border border-line bg-surface-2 px-3 py-3 font-mono text-sm tabular-nums">
          {recoveryCodes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copyCodes}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy codes</>}</Button>
          <Button variant="primary" onClick={() => { setRecoveryCodes([]); reset() }}>I’ve saved them</Button>
        </div>
      </div>
    )
  }

  if (step === 'setup' && setup) {
    return (
      <form onSubmit={confirmSetup} className="grid gap-3">
        <p className="text-sm text-muted">Scan this with an authenticator app (like Google Authenticator, 1Password or Authy), then enter the code it shows.</p>
        <img src={setup.qrCode} alt="QR code for your authenticator app" width={176} height={176} className="rounded-ctl border border-line bg-white p-2" />
        <p className="text-xs text-subtle">
          Can’t scan? Enter this key instead:{' '}
          <span className="font-mono text-ink break-all select-all">{setup.secret.match(/.{1,4}/g).join(' ')}</span>
        </p>
        {codeInput('settings-2fa-confirm', '6-digit code')}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" loading={state.busy} disabled={!code.trim()}>Turn on</Button>
          <Button variant="ghost" onClick={reset}>Cancel</Button>
        </div>
      </form>
    )
  }

  if (step === 'disable') {
    return (
      <form onSubmit={turnOff} className="grid gap-3">
        {codeInput('settings-2fa-disable', 'Code from your app, or a recovery code')}
        <div className="flex gap-2">
          <Button type="submit" variant="danger" loading={state.busy} disabled={!code.trim()}>Turn off</Button>
          <Button variant="ghost" onClick={reset}>Cancel</Button>
        </div>
      </form>
    )
  }

  return (
    <div className="grid gap-2">
      {enabled ? (
        <TwoFactorOn />
      ) : (
        <p className="text-sm text-muted">Ask for a code from an authenticator app when you sign in, so a stolen password isn’t enough.</p>
      )}
      {state.error ? <p className="text-xs text-danger" role="alert">{state.error}</p> : null}
      {enabled
        ? <Button variant="secondary" className="justify-self-start" onClick={() => setStep('disable')}>Turn off</Button>
        : <Button variant="secondary" className="justify-self-start" onClick={start} loading={state.busy}>Set up two-factor login</Button>}
    </div>
  )
}

export default function SettingsSheet({ open, onClose, onSignOut }) {
  const titleId = useId()
  const [theme, setTheme] = useTheme()
  const { user, setApartmentName, setEmailStatus, setTwoFactorEnabled } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(user.apartmentCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const el = document.getElementById('settings-home-code')
      if (el) window.getSelection().selectAllChildren(el)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} variant="drawer" labelledBy={titleId}>
      <SheetHeader id={titleId} title="Settings" onClose={onClose} />
      <SheetBody className="gap-7">
        <section className="grid gap-2.5">
          <h3 className="text-xs font-semibold text-muted">Appearance</h3>
          <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} label="Theme" stretch />
          <p className="text-xs text-subtle">System follows your device’s light or dark setting.</p>
        </section>

        {user ? (
          <section className="grid gap-4">
            <h3 className="text-xs font-semibold text-muted">Home</h3>
            <HomeNameForm initialName={user.apartmentName || ''} onSaved={setApartmentName} />
            <Field label="Home code" hint="Roommates use this code to join.">
              <div className="flex gap-2">
                <span id="settings-home-code" className="flex h-11 flex-1 items-center rounded-ctl border border-line bg-surface-2 px-3 text-lg font-bold tracking-[0.12em] tabular-nums">
                  {user.apartmentCode}
                </span>
                <Button variant="secondary" size="lg" onClick={copyCode}>
                  {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                </Button>
              </div>
            </Field>
          </section>
        ) : null}

        <section className="grid gap-3">
          <h3 className="text-xs font-semibold text-muted">Account</h3>
          <p>Signed in as <b className="font-semibold">{user?.username}</b></p>
          {user ? <EmailForm email={user.email || ''} emailVerified={Boolean(user.emailVerified)} onSaved={setEmailStatus} /> : null}
          <Button variant="secondary" className="justify-self-start" onClick={onSignOut}><LogOut size={16} /> Sign out</Button>
        </section>

        {user ? (
          <section className="grid gap-3">
            <h3 className="text-xs font-semibold text-muted">Two-factor login</h3>
            <TwoFactorSection enabled={Boolean(user.twoFactorEnabled)} onChange={setTwoFactorEnabled} />
          </section>
        ) : null}
      </SheetBody>
    </Sheet>
  )
}
