import { useCallback, useEffect, useState } from 'react'
import {
  DisplayRequestError,
  clearCredential,
  fetchDisplayChores,
  pollPairing,
  readCredential,
  saveCredential,
  startPairing
} from '../services/displayApi'
import { getTaskStatus, sortTasks } from '../lib/taskStatus'

const POLL_MS = 3000
// How often the Display reads its Chores, which is also how it finds out it was unpaired
const REFRESH_MS = 60 * 1000

// Opened on the TV at /display, whether or not anyone is signed in there.
// Shows a Pairing code until a Roommate pairs it, then the Apartment's Chores. Read-only.
export default function DisplayPage() {
  const [credential, setCredential] = useState(() => readCredential())

  const paired = useCallback((next) => {
    saveCredential(next)
    setCredential(next)
  }, [])

  // A 401 means a Roommate unpaired this screen or paired another: start over with a fresh code
  const unpaired = useCallback(() => {
    clearCredential()
    setCredential(null)
  }, [])

  return (
    <main className="min-h-screen bg-black p-[4vmin] text-white">
      {credential
        ? <Showing credential={credential} onUnpaired={unpaired} />
        : <Pairing onPaired={paired} />}
    </main>
  )
}

function Pairing({ onPaired }) {
  const [code, setCode] = useState(null)
  const [problem, setProblem] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer

    const begin = async () => {
      let pairing
      try {
        pairing = await startPairing()
      } catch {
        if (cancelled) return
        setProblem(true)
        timer = setTimeout(begin, POLL_MS * 2)
        return
      }
      if (cancelled) return
      setProblem(false)
      setCode(pairing.code)
      const expiresAt = new Date(pairing.expiresAt).getTime()

      const check = async () => {
        // Ask for a fresh code as soon as this one runs out
        if (Date.now() >= expiresAt) return begin()
        let result = null
        try {
          result = await pollPairing(pairing.pairingSecret)
        } catch {
          // Offline or the server restarting: keep trying until the code expires
        }
        if (cancelled) return
        if (result?.status === 'paired') return onPaired(result.credential)
        if (result?.status === 'expired') return begin()
        timer = setTimeout(check, POLL_MS)
      }
      timer = setTimeout(check, POLL_MS)
    }

    begin()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [onPaired])

  return (
    <div className="grid min-h-[90vh] place-content-center justify-items-center gap-[3vmin] text-center">
      <h1 className="text-[4vmin] font-semibold text-neutral-300">Pair this Display</h1>
      <p aria-live="polite" className="text-[16vmin] leading-none font-bold tracking-[0.15em]">{code || '······'}</p>
      <p className="max-w-[80vw] text-[3.2vmin] text-neutral-300">
        On your phone or laptop, open Settings, find the Display section under Home and enter this code.
      </p>
      <p className="max-w-[80vw] text-[2.4vmin] text-neutral-400">
        The code changes every few minutes. Set the Fire TV screensaver to Never so this stays visible.
      </p>
      {problem ? <p role="alert" className="text-[2.4vmin] text-amber-300">Can’t reach the server. Trying again…</p> : null}
    </div>
  )
}

function Showing({ credential, onUnpaired }) {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [now] = useState(() => new Date())

  useEffect(() => {
    let cancelled = false
    const load = () => fetchDisplayChores(credential)
      .then((result) => { if (!cancelled) { setData(result); setFailed(false) } })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof DisplayRequestError && error.status === 401) return onUnpaired()
        setFailed(true) // keeps whatever is already showing
      })
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [credential, onUnpaired])

  if (!data) {
    return <p className="grid min-h-[90vh] place-content-center text-[4vmin] text-neutral-300">{failed ? 'Can’t load the chores. Reload to try again.' : 'Loading…'}</p>
  }

  const chores = sortTasks(data.chores, 'due', now)
  return (
    <div className="grid gap-[2vmin]">
      <h1 className="text-[5vmin] font-bold">{data.apartmentName || 'Chores'}</h1>
      {chores.length === 0 ? <p className="text-[3.6vmin] text-neutral-300">No chores yet.</p> : (
        <ul className="grid gap-[1.2vmin]">
          {chores.map((chore) => {
            const status = getTaskStatus(chore, now)
            return (
              <li key={chore.id} className="flex items-baseline justify-between gap-[3vmin] border-b border-neutral-800 pb-[1vmin] text-[3.6vmin]">
                <span className="font-semibold">{chore.name}{chore.assignedTo ? <span className="font-normal text-neutral-400"> · {chore.assignedTo}</span> : null}</span>
                <span className={status.tone === 'overdue' ? 'font-bold text-red-400' : 'text-neutral-300'}>{status.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
