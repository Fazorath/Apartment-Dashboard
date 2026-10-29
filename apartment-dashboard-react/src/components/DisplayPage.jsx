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
import { fitGroups, getDisplayView } from '../lib/displayView'
import { REFRESH_MS, msUntilNextReload, retryDelay } from '../lib/displayRefresh'
import { plural } from '../lib/taskStatus'

const POLL_MS = 3000
// How often the clock (and so the day rollover) is checked
const CLOCK_MS = 15 * 1000
// Rows that fit under a section heading at the sizes below, a group heading counting as a row
const MAX_ROWS = 14

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
    <main className="box-border h-screen cursor-none overflow-hidden bg-black p-[3vh] text-white">
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
  const [offlineSince, setOfflineSince] = useState(null)
  const now = useNow()

  // Reads the Chores every minute (a 401 means unpaired). When the server can't be reached or errors,
  // keeps what is showing, notes since when, and retries with backoff until it answers again.
  useEffect(() => {
    let cancelled = false
    let timer
    let failures = 0
    const load = async () => {
      let delay = REFRESH_MS
      try {
        const result = await fetchDisplayChores(credential)
        if (cancelled) return
        failures = 0
        setData(result)
        setOfflineSince(null)
      } catch (error) {
        if (cancelled) return
        if (error instanceof DisplayRequestError && error.status === 401) return onUnpaired()
        failures += 1
        delay = retryDelay(failures)
        setOfflineSince((since) => since ?? new Date())
      }
      timer = setTimeout(load, delay)
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [credential, onUnpaired])

  // Reload once a day so the TV picks up a new app version and doesn't slow down over weeks
  useEffect(() => {
    // Checked on a short interval rather than one long timer, which a sleeping TV or a clock change could skip
    const reloadAt = Date.now() + msUntilNextReload()
    const timer = setInterval(() => { if (Date.now() >= reloadAt) window.location.reload() }, CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

  if (!data) {
    return <p className="grid min-h-[90vh] place-content-center text-[4vmin] text-neutral-300">{offlineSince ? 'Can’t reach the server. Trying again…' : 'Loading…'}</p>
  }

  const view = getDisplayView(data.chores ?? [], now)
  const nothingDue = view.today.length === 0 && view.week.length === 0

  return (
    <div className="grid h-full grid-rows-[10vh_1fr] gap-[2vh]">
      <header className="flex items-center justify-between gap-[3vw] border-b border-neutral-700">
        <h1 className="truncate text-[6vh] leading-[10vh] font-bold">{data.apartmentName || 'Chores'}</h1>
        <div className="text-right">
          <p className="text-[6vh] leading-none font-bold tabular-nums">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          <p className="mt-[0.8vh] text-[3vh] text-neutral-300">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          {offlineSince ? <p role="status" className="text-[2.4vh] text-amber-300">Offline since {offlineSince.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p> : null}
        </div>
      </header>
      {nothingDue ? (
        <p className="grid place-content-center text-center text-[7vh] font-bold text-emerald-300">Nothing due. Enjoy the day!</p>
      ) : (
        <div className="grid min-h-0 grid-cols-2 gap-[3vw]">
          <Section title="Today" groups={view.today} empty="All clear today" />
          <Section title="This week" groups={view.week} empty="Nothing else this week" showDue />
        </div>
      )}
    </div>
  )
}

// The current time, refreshed so the clock and the day rollover stay right
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}

function Section({ title, groups, empty, showDue = false }) {
  const { groups: shown, more } = fitGroups(groups, MAX_ROWS)
  return (
    <section className="flex min-h-0 flex-col overflow-hidden">
      <h2 className="h-[6vh] text-[4vh] leading-[6vh] font-bold tracking-wide text-sky-300 uppercase">{title}</h2>
      {shown.length === 0 ? <p className="text-[3.4vh] text-neutral-400">{empty}</p> : null}
      {shown.map((group) => (
        <div key={group.assignee ?? ''}>
          <h3 className="h-[5.2vh] truncate text-[3vh] leading-[5.2vh] font-semibold tracking-wide text-neutral-400 uppercase">{group.assignee || 'Unassigned'}</h3>
          {group.items.map((item) => <Row key={item.chore.id} item={item} showDue={showDue} />)}
        </div>
      ))}
      {more > 0 ? <p className="h-[5.2vh] text-[3.2vh] leading-[5.2vh] font-semibold text-neutral-300">+{more} more</p> : null}
    </section>
  )
}

function Row({ item, showDue }) {
  const { chore, overdue, overdueDays, doneToday, doneBy, dueDate } = item
  let note = null
  if (doneToday) note = <span className="text-emerald-300">Done{doneBy ? ` by ${doneBy}` : ''}</span>
  else if (overdue) note = <span className="font-bold text-red-300">{overdueDays ? `${plural(overdueDays, 'day')} overdue` : 'Never done'}</span>
  else if (showDue) note = <span className="text-neutral-300">{dueDate.toLocaleDateString([], { weekday: 'long' })}</span>
  const tone = doneToday ? 'text-neutral-400' : overdue ? 'bg-red-950 border-l-[0.8vh] border-red-400 pl-[1.2vh]' : ''
  return (
    <div className={`flex h-[5.2vh] items-center justify-between gap-[2vw] overflow-hidden text-[3.4vh] ${tone}`}>
      <span className={`truncate leading-[5.2vh] font-semibold ${doneToday ? 'line-through' : ''}`}>{chore.name}</span>
      <span className="shrink-0">{note}</span>
    </div>
  )
}
