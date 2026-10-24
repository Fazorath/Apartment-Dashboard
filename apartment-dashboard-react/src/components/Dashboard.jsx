import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ChevronDown, Plus, RefreshCw } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import { getTasks, createTask, updateTask, deleteTask, markTaskDone } from '../services/api'
import AppShell from './AppShell'
import TaskRow from './TaskRow'
import TaskDrawer from './TaskDrawer'
import TaskModal from './TaskModal'
import SettingsSheet from './SettingsSheet'
import RoommatesPanel from './RoommatesPanel'
import WeekStrip from './WeekStrip'
import Card from './ui/Card'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import Avatar from './ui/Avatar'
import Toast from './ui/Toast'
import ConfirmDialog from './ui/ConfirmDialog'
import { daysBetween, DONE_WINDOW_DAYS, getTaskStatus, GROUPS, isDoneToday, plural, SORT_OPTIONS, sortTasks, toLocalDate } from '../lib/taskStatus'
import { displayName, sameName } from '../lib/people'
import useChoreSort from '../hooks/useChoreSort'

const HOLD_MS = 5000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const matchesQuery = (task, query) => {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  if (!q) return true
  return (
    task.name.toLowerCase().includes(q) ||
    (task.assignedTo || '').toLowerCase().includes(q) ||
    (task.notes || '').toLowerCase().includes(q) ||
    (task.tags || []).some((tag) => tag.toLowerCase().includes(q))
  )
}

function SkeletonList() {
  return (
    <Card className="overflow-hidden" aria-busy="true" aria-label="Loading chores">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4 [&+div]:border-t [&+div]:border-line">
          <div className="h-5 w-5 animate-pulse rounded-md bg-surface-2" />
          <div className="grid flex-1 gap-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-surface-2" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-pill bg-surface-2" />
        </div>
      ))}
    </Card>
  )
}

export default function Dashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { taskId } = useParams()
  const me = displayName(user?.username)
  const searchRef = useRef(null)

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [person, setPerson] = useState(null)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useChoreSort()
  const [expanded, setExpanded] = useState({ ontrack: false, done: false })
  const [held, setHeld] = useState({}) // taskId -> group it was in before being checked off
  const [modal, setModal] = useState({ open: false, task: null })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const holdTimers = useRef({})
  const toastTimer = useRef(null)

  const settingsOpen = location.pathname === '/settings'
  const openTask = tasks.find((t) => t._id === taskId) || null

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setTasks(await getTasks())
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setLoadError(err.response?.data?.error || 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const timers = holdTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
      clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = useCallback((message, action) => {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, ...action })
    toastTimer.current = setTimeout(() => setToast(null), action ? HOLD_MS : 2500)
  }, [])

  const replaceTask = useCallback((updated) => {
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))
  }, [])

  const release = useCallback((id) => {
    clearTimeout(holdTimers.current[id])
    delete holdTimers.current[id]
    setHeld((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const undoDone = useCallback(async (task) => {
    try {
      const updated = await updateTask({
        id: task._id,
        lastDone: task.previousLastDone || null,
        lastCompleted: null,
        lastCompletedBy: null,
        previousLastDone: null,
      })
      release(task._id)
      replaceTask(updated)
      showToast(`“${task.name}” marked not done`)
    } catch (err) {
      console.error('Failed to undo completion:', err)
      showToast('Couldn’t undo. Try again.')
    }
  }, [release, replaceTask, showToast])

  const toggleDone = useCallback(async (task) => {
    if (isDoneToday(task)) return undoDone(task)
    const before = getTaskStatus(task).group
    try {
      const updated = await markTaskDone(task._id)
      replaceTask(updated)
      // Keep the row where it was for a moment so the check registers before it moves to Done.
      setHeld((prev) => ({ ...prev, [task._id]: before }))
      clearTimeout(holdTimers.current[task._id])
      holdTimers.current[task._id] = setTimeout(() => release(task._id), HOLD_MS)
      showToast(`Marked “${task.name}” done`, { actionLabel: 'Undo', onAction: () => undoDone(updated) })
    } catch (err) {
      console.error('Failed to mark task done:', err)
      showToast('Couldn’t mark that done. Try again.')
    }
  }, [release, replaceTask, showToast, undoDone])

  const togglePaused = async (task) => {
    try {
      const updated = await updateTask({ id: task._id, active: task.active === false })
      replaceTask(updated)
      showToast(updated.active === false ? `Paused “${task.name}”` : `Resumed “${task.name}”`)
    } catch (err) {
      console.error('Failed to pause task:', err)
      showToast('Couldn’t update that chore. Try again.')
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteTask(toDelete._id)
      setTasks((prev) => prev.filter((t) => t._id !== toDelete._id))
      showToast(`Deleted “${toDelete.name}”`)
      setToDelete(null)
      navigate('/')
    } catch (err) {
      console.error('Failed to delete task:', err)
      showToast('Couldn’t delete that chore. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  const saveTask = async (data) => {
    if (modal.task) {
      const updated = await updateTask({ id: modal.task._id, ...data })
      replaceTask(updated)
      showToast(`Saved “${updated.name}”`)
    } else {
      const created = await createTask(data)
      setTasks((prev) => [...prev, created])
      showToast(`Added “${created.name}”`)
    }
    setModal((m) => ({ ...m, open: false }))
  }

  const openNew = useCallback(() => setModal({ open: true, task: null }), [])
  const openEdit = (task) => {
    navigate('/')
    setModal({ open: true, task })
  }
  const signOut = () => {
    logout()
    navigate('/', { replace: true })
  }

  // "/" focuses search, "n" adds a chore, when nothing else has focus or is open.
  useEffect(() => {
    const onKey = (event) => {
      const tag = event.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      if (modal.open || taskId || settingsOpen || toDelete) return
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key === 'n' || event.key === 'N') { event.preventDefault(); openNew() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal.open, taskId, settingsOpen, toDelete, openNew])

  const today = new Date()
  const withStatus = useMemo(() => tasks.map((task) => ({ task, status: getTaskStatus(task) })), [tasks])

  const counts = {
    overdue: withStatus.filter((x) => x.status.group === 'overdue').length,
    soon: withStatus.filter((x) => x.status.group === 'soon').length,
    done: withStatus.filter((x) => x.status.group === 'done').length,
    mine: tasks.filter((t) => sameName(t.assignedTo, me)).length,
  }

  const people = useMemo(() => {
    const names = []
    const add = (name) => { if (name && !names.some((n) => sameName(n, name))) names.push(name) }
    add(me)
    tasks.forEach((t) => add(t.assignedTo?.trim()))
    const stats = (name) => {
      const mine = withStatus.filter((x) => (name ? sameName(x.task.assignedTo, name) : !x.task.assignedTo?.trim()))
      return {
        name,
        isMe: Boolean(name) && sameName(name, me),
        total: mine.length,
        overdue: mine.filter((x) => x.status.group === 'overdue').length,
        doneThisWeek: mine.filter((x) => {
          const completed = toLocalDate(x.task.lastCompleted)
          return completed && daysBetween(completed, new Date()) < DONE_WINDOW_DAYS
        }).length,
      }
    }
    const list = names.map(stats)
    if (tasks.some((t) => !t.assignedTo?.trim())) list.push(stats(''))
    return list
  }, [tasks, withStatus, me])

  const busiest = useMemo(() => {
    const load = {}
    withStatus.forEach(({ task, status }) => {
      const who = task.assignedTo?.trim()
      if (who && (status.group === 'overdue' || status.group === 'soon')) load[who] = (load[who] || 0) + 1
    })
    return Object.entries(load).sort((a, b) => b[1] - a[1])[0] || null
  }, [withStatus])

  const visible = withStatus.filter(({ task }) => {
    if (person !== null && (person ? !sameName(task.assignedTo, person) : Boolean(task.assignedTo?.trim()))) return false
    if (filter === 'mine' && !sameName(task.assignedTo, me)) return false
    return matchesQuery(task, query)
  })

  const groups = GROUPS
    .filter((g) => (filter === 'overdue' ? g.id === 'overdue' : filter === 'done' ? g.id === 'done' : true))
    .map((g) => {
      const inGroup = visible.filter(({ task, status }) => (held[task._id] || status.group) === g.id)
      const statusOf = new Map(inGroup.map(({ task, status }) => [task, status]))
      const items = sortTasks(inGroup.map(({ task }) => task), sortKey, today).map((task) => ({ task, status: statusOf.get(task) }))
      const collapsible = (g.id === 'ontrack' || g.id === 'done') && filter !== 'done'
      return { ...g, items, collapsible, open: !collapsible || expanded[g.id] || Boolean(query.trim()) }
    })
    .filter((g) => g.items.length || g.id === 'overdue' || filter === 'done')

  const dateLine = `${WEEKDAYS[today.getDay()]}, ${MONTHS[today.getMonth()]} ${today.getDate()}`

  let headline
  if (!tasks.length) headline = <>Let’s set up your chores.</>
  else if (!counts.overdue && !counts.soon) headline = <>Everything is on track.</>
  else headline = (
    <>
      {counts.overdue ? <span className="text-danger">{counts.overdue} overdue</span> : 'Nothing overdue'}
      {counts.soon ? <>, <span className="text-warning">{counts.soon} due soon</span></> : null}.
    </>
  )
  const subline = !tasks.length
    ? 'Add the chores your home repeats and who usually does them.'
    : busiest
      ? `${sameName(busiest[0], me) ? 'You have the most on your plate' : `${busiest[0]} has the most on their plate`} (${plural(busiest[1], 'chore')}).`
      : 'Nice work, everyone.'

  const roommateNames = people.map((p) => p.name).filter(Boolean)

  return (
    <AppShell
      homeName={user?.apartmentName || 'Your home'}
      homeCode={user?.apartmentCode || ''}
      userName={me}
      search={query}
      onSearchChange={setQuery}
      searchRef={searchRef}
      onAddTask={openNew}
      onOpenSettings={() => navigate('/settings')}
      onSignOut={signOut}
    >
      <main className="mx-auto max-w-[1200px] px-4 pt-7 pb-24 lg:px-8">
        <section className="mb-5">
          <p className="mb-1 text-[13px] text-muted">{dateLine}</p>
          <h1 className="text-[22px] leading-[30px] font-semibold tracking-tight text-balance">{loading ? 'Loading your chores…' : headline}</h1>
          {!loading && !loadError ? <p className="mt-1 text-muted">{subline}</p> : null}
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-8">
          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Segmented
                label="Filter chores"
                value={filter}
                onChange={(value) => {
                  setFilter(value)
                  setPerson(null)
                }}
                options={[
                  { value: 'all', label: 'All', count: tasks.length },
                  { value: 'mine', label: 'Mine', count: counts.mine },
                  { value: 'overdue', label: 'Overdue', count: counts.overdue },
                  { value: 'done', label: 'Done this week', count: counts.done },
                ]}
              />
              {person !== null ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface pr-1.5 pl-1 text-[13px] font-medium">
                  <Avatar name={person} /> {person || 'Unassigned'}
                  <button type="button" onClick={() => setPerson(null)} aria-label="Show everyone" className="grid h-6 w-6 place-items-center rounded-full text-subtle hover:bg-surface-2 hover:text-ink">×</button>
                </span>
              ) : null}
              <label className="inline-flex items-center gap-2 text-[13px] text-muted">
                Sort by
                <span className="relative inline-flex">
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value)}
                    className="h-9 appearance-none rounded-ctl border border-line bg-surface-2 pr-8 pl-3 text-sm font-medium text-ink transition-[border-color,background-color,box-shadow] duration-150 hover:border-subtle focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                  >
                    {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-subtle" />
                </span>
              </label>
            </div>

            {loading ? <SkeletonList /> : loadError ? (
              <Card className="px-5 py-7 text-center">
                <p className="mb-1 text-[15px] font-medium">Couldn’t load your chores</p>
                <p className="text-muted">{loadError}</p>
                <Button variant="secondary" className="mt-3" onClick={load}><RefreshCw size={16} /> Try again</Button>
              </Card>
            ) : !tasks.length ? (
              <Card className="px-5 py-7 text-center">
                <p className="mb-1 text-[15px] font-medium">No chores yet</p>
                <p className="text-muted">Add the first one and assign it to someone.</p>
                <Button variant="primary" className="mt-3" onClick={openNew}><Plus size={16} /> Add task</Button>
              </Card>
            ) : !visible.length ? (
              <Card className="px-5 py-7 text-center">
                <p className="mb-1 text-[15px] font-medium">No chores match{query ? ` “${query}”` : ''}</p>
                <p className="text-muted">Try another name, tag or word.</p>
                <Button variant="secondary" className="mt-3" onClick={() => { setQuery(''); setPerson(null); setFilter('all') }}>Clear filters</Button>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                {groups.map((group) => {
                  const dot = { overdue: 'bg-danger', soon: 'bg-warning', ontrack: 'bg-subtle', done: 'bg-accent' }[group.id]
                  const heading = (
                    <>
                      <i className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                      {group.label} <span className="font-medium text-subtle tabular-nums">{group.items.length}</span>
                    </>
                  )
                  return (
                    <div key={group.id} className="[&+div]:border-t [&+div]:border-line">
                      {group.collapsible ? (
                        <button
                          type="button"
                          aria-expanded={group.open}
                          onClick={() => setExpanded((e) => ({ ...e, [group.id]: !e[group.id] }))}
                          className="group/h flex w-full items-center gap-2.5 px-5 pt-3.5 pb-2.5 text-left text-sm font-semibold"
                        >
                          {heading}
                          <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-subtle group-hover/h:text-ink">
                            {group.open ? 'Hide' : 'Show'}
                            <ChevronDown size={16} className={`transition-transform duration-200 ${group.open ? 'rotate-180' : ''}`} />
                          </span>
                        </button>
                      ) : (
                        <h2 className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5 text-sm font-semibold">{heading}</h2>
                      )}
                      {group.open ? (
                        group.items.length ? (
                          <ul className="m-0 list-none p-0 pb-1.5">
                            {group.items.map(({ task, status }) => (
                              <TaskRow
                                key={task._id}
                                task={task}
                                status={status}
                                group={held[task._id] || status.group}
                                checked={isDoneToday(task)}
                                me={me}
                                onToggleDone={toggleDone}
                                onOpen={(t) => navigate(`/tasks/${t._id}`)}
                              />
                            ))}
                          </ul>
                        ) : (
                          <p className="px-5 pb-3.5 pl-16 text-[13px] text-subtle">{group.id === 'overdue' ? 'Nothing overdue. Nice.' : 'Nothing here right now.'}</p>
                        )
                      ) : null}
                    </div>
                  )
                })}
              </Card>
            )}
          </section>

          <aside className="grid min-w-0 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3">
            <RoommatesPanel
              people={people}
              selected={person}
              onSelect={(name) => {
                setPerson(name)
                setFilter('all')
                setExpanded((e) => ({ ...e, ontrack: true }))
              }}
            />
            <WeekStrip tasks={tasks} today={today} />
          </aside>
        </div>
      </main>

      <TaskDrawer
        task={openTask}
        me={me}
        onClose={() => navigate('/')}
        onToggleDone={toggleDone}
        onEdit={openEdit}
        onTogglePaused={togglePaused}
        onDelete={setToDelete}
        onTaskUpdated={replaceTask}
      />

      <TaskModal
        open={modal.open}
        task={modal.task}
        me={me}
        roommates={roommateNames}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={saveTask}
      />

      <SettingsSheet open={settingsOpen} onClose={() => navigate('/')} onSignOut={signOut} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete ? `Delete “${toDelete.name}”?` : ''}
        message="This removes it for everyone in your home. You can’t undo this."
        confirmLabel="Delete chore"
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AppShell>
  )
}
