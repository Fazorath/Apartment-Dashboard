import { Check, Pin } from 'lucide-react'
import Avatar from './ui/Avatar'
import StatusPill from './ui/StatusPill'
import { frequencyText, lastDoneText } from '../lib/taskStatus'
import { sameName } from '../lib/people'

const EDGE = {
  overdue: 'before:bg-danger',
  soon: 'before:bg-warning',
}

export default function TaskRow({ task, status, group, checked, me, onToggleDone, onOpen }) {
  const by = task.lastCompletedBy && task.lastDone ? ` by ${sameName(task.lastCompletedBy, me) ? 'you' : task.lastCompletedBy}` : ''
  const meta = task.active === false
    ? `Paused · ${frequencyText(task.frequencyDays).toLowerCase()}`
    : `${frequencyText(task.frequencyDays)} · ${lastDoneText(task)}${by}`

  return (
    <li
      className={`group/row relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3 py-2 pr-3 pl-2 transition-colors duration-150 hover:bg-surface-2 sm:grid-cols-[44px_minmax(0,1fr)_auto_auto] sm:pr-5 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-[3px] before:rounded-r-[3px] ${EDGE[group] || ''} [&+li]:shadow-[inset_0_1px_0_color-mix(in_srgb,var(--border)_60%,transparent)]`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={checked ? `Mark ${task.name} not done` : `Mark ${task.name} done`}
        onClick={() => onToggleDone(task)}
        className="relative z-10 grid h-11 w-11 place-items-center rounded-ctl"
      >
        <span
          className={`grid h-5 w-5 place-items-center rounded-md border-[1.5px] transition-colors duration-150 ${
            checked ? 'border-accent bg-accent text-on-accent' : 'border-subtle hover:border-accent hover:bg-accent-soft'
          }`}
        >
          {checked ? <Check size={14} strokeWidth={2.5} /> : null}
        </span>
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="flex w-full min-w-0 items-center gap-1.5 text-left text-[15px] leading-[22px] font-medium after:absolute after:inset-0 after:content-['']"
        >
          {task.pinned ? <Pin size={14} className="flex-none text-muted" aria-label="Pinned" /> : null}
          <span className={`truncate ${checked ? 'text-muted line-through decoration-subtle' : ''}`}>{task.name}</span>
        </button>
        <p className="truncate text-[13px] leading-[18px] text-muted">
          {meta}
          {task.tags?.length ? <span className="text-subtle"> · {task.tags.map((tag) => `#${tag}`).join(' ')}</span> : null}
        </p>
      </div>

      <Avatar name={task.assignedTo} className="max-sm:hidden" />
      <StatusPill status={status} className="sm:min-w-28" />
    </li>
  )
}
