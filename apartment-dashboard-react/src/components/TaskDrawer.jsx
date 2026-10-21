import { useEffect, useId, useRef, useState } from 'react'
import { Check, Clock, Pause, Pencil, Pin, Play, Trash2 } from 'lucide-react'
import Sheet, { SheetBody, SheetFooter, SheetHeader } from './ui/Sheet'
import Button from './ui/Button'
import Avatar from './ui/Avatar'
import StatusPill from './ui/StatusPill'
import PriorityBadge from './ui/PriorityBadge'
import { Textarea } from './ui/Field'
import { updateTask } from '../services/api'
import { daysBetween, formatShortDate, frequencyText, getTaskStatus, isDoneToday, toLocalDate, toPriority } from '../lib/taskStatus'
import { sameName } from '../lib/people'

const NOTES_SAVE_DELAY_MS = 700

function NotesEditor({ task, onTaskUpdated }) {
  const [draft, setDraft] = useState(task.notes || '')
  const [state, setState] = useState('idle') // idle | saving | saved | error
  const timer = useRef(null)
  const latest = useRef(draft)

  useEffect(() => () => clearTimeout(timer.current), [])

  const save = async (value) => {
    setState('saving')
    try {
      const updated = await updateTask({ id: task._id, notes: value })
      if (latest.current === value) setState('saved')
      onTaskUpdated(updated)
    } catch (error) {
      console.error('Failed to save notes:', error)
      setState('error')
    }
  }

  const onChange = (event) => {
    const value = event.target.value
    setDraft(value)
    latest.current = value
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(value), NOTES_SAVE_DELAY_MS)
  }

  const statusText = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Couldn’t save. Keep typing to retry.' }[state]

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor="drawer-notes" className="text-xs font-medium text-muted">Notes</label>
        <span className={`text-xs ${state === 'error' ? 'text-danger' : 'text-subtle'}`} aria-live="polite">{statusText}</span>
      </div>
      <Textarea id="drawer-notes" value={draft} onChange={onChange} maxLength={500} placeholder="Anything roommates should know" />
    </div>
  )
}

export default function TaskDrawer({ task, me, onClose, onToggleDone, onEdit, onTogglePaused, onDelete, onTaskUpdated }) {
  const titleId = useId()
  // Keep showing the last task while the drawer animates closed.
  const lastTask = useRef(task)
  if (task) lastTask.current = task
  const shown = task || lastTask.current

  return (
    <Sheet open={Boolean(task)} onClose={onClose} variant="drawer" labelledBy={titleId}>
      {shown ? <DrawerContent key={shown._id} task={shown} me={me} titleId={titleId} {...{ onClose, onToggleDone, onEdit, onTogglePaused, onDelete, onTaskUpdated }} /> : null}
    </Sheet>
  )
}

function DrawerContent({ task, me, titleId, onClose, onToggleDone, onEdit, onTogglePaused, onDelete, onTaskUpdated }) {
  const today = new Date()
  const status = getTaskStatus(task, today)
  const done = isDoneToday(task, today)
  const paused = task.active === false
  const lastDone = toLocalDate(task.lastDone)
  const sinceText = lastDone ? daysBetween(lastDone, today) : null
  const isMine = sameName(task.assignedTo, me)
  const priority = toPriority(task.priority)

  return (
    <>
      <SheetHeader
        id={titleId}
        title={task.name}
        onClose={onClose}
        actions={<Button variant="ghost" size="icon" onClick={() => onEdit(task)} aria-label="Edit chore"><Pencil size={16} /></Button>}
      >
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          {task.pinned ? <span className="inline-flex items-center gap-1 text-xs text-subtle"><Pin size={13} /> Pinned</span> : null}
        </div>
      </SheetHeader>

      <SheetBody>
        {paused ? (
          <Button variant="secondary" size="lg" onClick={() => onTogglePaused(task)}><Play size={16} /> Resume chore</Button>
        ) : (
          <Button variant={done ? 'secondary' : 'primary'} size="lg" onClick={() => onToggleDone(task)} data-autofocus>
            {done ? 'Undo: mark not done' : <><Check size={16} /> Mark done</>}
          </Button>
        )}

        <dl className="m-0 grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-3">
          <dt className="text-muted">Assigned to</dt>
          <dd className="m-0 flex items-center gap-2">
            <Avatar name={task.assignedTo} />
            {task.assignedTo ? `${task.assignedTo}${isMine ? ' (you)' : ''}` : <span className="text-subtle">Unassigned</span>}
          </dd>
          <dt className="text-muted">Priority</dt>
          <dd className="m-0"><PriorityBadge priority={priority} showNormal /></dd>
          <dt className="text-muted">Repeats</dt>
          <dd className="m-0">{frequencyText(task.frequencyDays)}</dd>
          <dt className="text-muted">Last done</dt>
          <dd className="m-0 tabular-nums">
            {lastDone ? <>{formatShortDate(lastDone)} <span className="text-subtle">({sinceText === 0 ? 'today' : sinceText === 1 ? 'yesterday' : `${sinceText} days ago`})</span></> : 'Never'}
          </dd>
          <dt className="text-muted">Next due</dt>
          <dd className="m-0 tabular-nums">{paused || !status.dueDate ? '—' : lastDone ? formatShortDate(status.dueDate) : 'Now'}</dd>
          <dt className="text-muted">Tags</dt>
          <dd className="m-0 text-muted">{task.tags?.length ? task.tags.map((tag) => `#${tag}`).join(' ') : <span className="text-subtle">None</span>}</dd>
        </dl>

        <NotesEditor task={task} onTaskUpdated={onTaskUpdated} />

        {task.lastCompletedBy && lastDone ? (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Clock size={16} /> Last done by {sameName(task.lastCompletedBy, me) ? 'you' : task.lastCompletedBy} on {formatShortDate(lastDone)}
          </p>
        ) : null}
      </SheetBody>

      <SheetFooter>
        <Button variant="ghost" onClick={() => onTogglePaused(task)}>
          {paused ? <><Play size={16} /> Resume</> : <><Pause size={16} /> Pause</>}
        </Button>
        <span className="flex-1" />
        <Button variant="danger" onClick={() => onDelete(task)}><Trash2 size={16} /> Delete</Button>
      </SheetFooter>
    </>
  )
}
