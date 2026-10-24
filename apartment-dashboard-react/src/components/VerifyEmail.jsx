import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, House, Loader2, MailX } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import Button from './ui/Button'
import { verifyEmail } from '../services/api'

// Opened from the link in a verification email, signed in or not.
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const { user, setEmailStatus } = useAuth()
  const [result, setResult] = useState({ state: 'pending', message: '' })
  // Tokens are single-use, so StrictMode's second effect run must not send it again
  const sentFor = useRef(null)

  useEffect(() => {
    if (sentFor.current === token) return
    sentFor.current = token
    if (!token) {
      setResult({ state: 'error', message: 'This verification link is missing its token.' })
      return
    }
    verifyEmail(token)
      .then((data) => {
        setResult({ state: 'ok', message: `${data.email} is verified. Password resets can now go to this address.` })
        if (user?.email === data.email) setEmailStatus({ email: data.email, emailVerified: true })
      })
      .catch((err) => {
        setResult({ state: 'error', message: err.response?.data?.error || 'Couldn’t verify your email. Try again.' })
      })
  }, [token, user, setEmailStatus])

  return (
    <div className="min-h-screen bg-bg px-4 text-ink">
      <main className="mx-auto grid min-h-screen max-w-[420px] place-items-center py-10">
        <div className="grid w-full gap-5 rounded-sheet border border-line bg-surface px-7 pt-8 pb-7 shadow-card max-sm:px-5" role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent"><House size={20} /></div>
            <h1 className="text-[22px] leading-7 font-bold tracking-tight">Verify your email</h1>
          </div>

          {result.state === 'pending' ? (
            <p className="flex items-center gap-2 text-muted"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Checking your link…</p>
          ) : (
            <p className={`flex items-start gap-2 ${result.state === 'ok' ? 'text-accent' : 'text-danger'}`}>
              {result.state === 'ok' ? <BadgeCheck size={18} className="mt-0.5 flex-none" aria-hidden="true" /> : <MailX size={18} className="mt-0.5 flex-none" aria-hidden="true" />}
              <span>{result.message}</span>
            </p>
          )}

          <Button variant="primary" size="lg" onClick={() => navigate('/', { replace: true })}>
            {user ? 'Back to chores' : 'Go to sign in'}
          </Button>
        </div>
      </main>
    </div>
  )
}
