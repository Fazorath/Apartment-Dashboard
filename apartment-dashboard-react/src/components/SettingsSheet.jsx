import { useId, useState } from 'react'
import { Check, Copy, LogOut } from 'lucide-react'
import Sheet, { SheetBody, SheetHeader } from './ui/Sheet'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import { Field, Input } from './ui/Field'
import useTheme, { THEME_OPTIONS } from '../hooks/useTheme'
import useAuth from '../hooks/useAuth'
import { updateApartmentName } from '../services/api'

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

export default function SettingsSheet({ open, onClose, onSignOut }) {
  const titleId = useId()
  const [theme, setTheme] = useTheme()
  const { user, setApartmentName } = useAuth()
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
          <Button variant="secondary" className="justify-self-start" onClick={onSignOut}><LogOut size={16} /> Sign out</Button>
        </section>
      </SheetBody>
    </Sheet>
  )
}
