import { useId, useState } from 'react'
import { BadgeCheck, Check, Copy, LogOut, MailWarning } from 'lucide-react'
import Sheet, { SheetBody, SheetHeader } from './ui/Sheet'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Field, Input } from './ui/Field'
import useTheme, { THEME_OPTIONS } from '../hooks/useTheme'
import useAuth from '../hooks/useAuth'
import { resendVerificationEmail, updateApartmentName, updateEmail } from '../services/api'
import { beginGoogleSignIn } from '../lib/googleSignIn'
import GoogleMark from './ui/GoogleMark'

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

function GoogleLink({ linked }) {
  const [status, setStatus] = useState({ starting: false, error: '' })

  const link = async () => {
    setStatus({ starting: true, error: '' })
    const failure = await beginGoogleSignIn('link')
    if (failure) setStatus({ starting: false, error: failure })
  }

  if (linked) {
    return <p className="flex items-center gap-1.5 text-sm text-muted"><GoogleMark size={16} /> Google is linked. You can sign in with it or your password.</p>
  }

  return (
    <div className="grid gap-1.5">
      <Button variant="secondary" className="justify-self-start" onClick={link} loading={status.starting}>
        {status.starting ? null : <GoogleMark size={16} />} Link Google
      </Button>
      {status.error ? <p className="text-xs text-danger" role="alert">{status.error}</p> : <p className="text-xs text-subtle">Then you can sign in with Google too.</p>}
    </div>
  )
}

export default function SettingsSheet({ open, onClose, onSignOut }) {
  const titleId = useId()
  const [theme, setTheme] = useTheme()
  const { user, setApartmentName, setEmailStatus } = useAuth()
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
          {user ? <GoogleLink linked={Boolean(user.googleLinked)} /> : null}
          <Button variant="secondary" className="justify-self-start" onClick={onSignOut}><LogOut size={16} /> Sign out</Button>
        </section>
      </SheetBody>
    </Sheet>
  )
}
