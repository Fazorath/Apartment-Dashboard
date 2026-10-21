import { useEffect, useId, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import Sheet, { SheetBody, SheetFooter, SheetHeader } from './ui/Sheet'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Avatar from './ui/Avatar'
import Switch from './ui/Switch'
import ConfirmDialog from './ui/ConfirmDialog'
import { Field, Input, Textarea } from './ui/Field'
import { addDays, daysBetween, toISODate, toLocalDate } from '../lib/taskStatus'
import { sameName } from '../lib/people'

const FREQUENCY_PRESETS = [
  { days: 1, label: 'Daily' },
  { days: 3, label: 'Every 3 days' },
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Monthly' },
]

const LAST_DONE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'never', label: 'Not yet' },
  { value: 'date', label: 'Pick a date' },
]

const initialForm = (task, me) => {
  if (!task) {
    return { name: '', assignedTo: me, newPerson: false, frequencyDays: 7, lastDoneChoice: 'today', lastDoneDate: toISODate(new Date()), notes: '', tags: [], pinned: false }
  }
  const lastDone = toLocalDate(task.lastDone)
  const since = lastDone ? daysBetween(lastDone, new Date()) : null
  return {
    name: task.name || '',
    assignedTo: task.assignedTo || '',
    newPerson: false,
    frequencyDays: task.frequencyDays || 7,
    lastDoneChoice: since === null ? 'never' : since === 0 ? 'today' : since === 1 ? 'yesterday' : 'date',
    lastDoneDate: lastDone ? toISODate(lastDone) : toISODate(new Date()),
    notes: task.notes || '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    pinned: Boolean(task.pinned),
  }
}

const lastDoneValue = (form) => {
  if (form.lastDoneChoice === 'today') return toISODate(new Date())
  if (form.lastDoneChoice === 'yesterday') return toISODate(addDays(new Date(), -1))
  if (form.lastDoneChoice === 'never') return null
  return form.lastDoneDate || null
}

function TaskForm({ task, me, roommates, onCancel, onSave, titleId, requestCloseRef }) {
  const [form, setForm] = useState(() => initialForm(task, me))
  const [tagDraft, setTagDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const newPersonRef = useRef(null)
  const tagRef = useRef(null)

  const update = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }

  const isPreset = FREQUENCY_PRESETS.some((p) => p.days === form.frequencyDays)
  const people = roommates.some((name) => sameName(name, me)) ? roommates : [me, ...roommates]
  const canSave = form.name.trim().length > 0 && form.frequencyDays >= 1

  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#/, '').replace(/,$/, '').toLowerCase()
    if (tag && !form.tags.includes(tag)) update({ tags: [...form.tags, tag] })
    setTagDraft('')
  }

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true)
    else onCancel()
  }

  useEffect(() => {
    requestCloseRef.current = requestClose
  })

  const submit = async (event) => {
    event?.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    setError('')
    const pendingTag = tagDraft.trim().replace(/^#/, '').toLowerCase()
    const tags = pendingTag && !form.tags.includes(pendingTag) ? [...form.tags, pendingTag] : form.tags
    const data = {
      name: form.name.trim(),
      assignedTo: form.assignedTo.trim(),
      frequencyDays: Math.min(365, Math.max(1, Number(form.frequencyDays) || 7)),
      notes: form.notes,
      tags,
      pinned: form.pinned,
    }
    const nextLastDone = lastDoneValue(form)
    const prevLastDone = task ? (toLocalDate(task.lastDone) ? toISODate(toLocalDate(task.lastDone)) : null) : undefined
    if (!task || nextLastDone !== prevLastDone) data.lastDone = nextLastDone
    try {
      await onSave(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Couldn’t save this chore. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <>
      <SheetHeader id={titleId} title={task ? 'Edit chore' : 'New chore'} onClose={requestClose} />
      <SheetBody>
        <form id="task-form" onSubmit={submit} className="grid gap-[18px]" noValidate>
          <Field label="What needs doing?" htmlFor="task-name">
            <Input id="task-name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Take out recycling" maxLength={100} data-autofocus />
          </Field>

          <Field label="Who">
            <div className="flex flex-wrap gap-2">
              {people.map((name) => (
                <Chip key={name} pressed={!form.newPerson && sameName(form.assignedTo, name)} onClick={() => update({ assignedTo: name, newPerson: false })}>
                  <Avatar name={name} /> {name}
                </Chip>
              ))}
              <Chip pressed={!form.newPerson && !form.assignedTo} onClick={() => update({ assignedTo: '', newPerson: false })}>Anyone</Chip>
              <Chip pressed={form.newPerson} onClick={() => { update({ assignedTo: '', newPerson: true }); setTimeout(() => newPersonRef.current?.focus(), 0) }}>
                <Plus size={14} /> Someone new
              </Chip>
            </div>
            {form.newPerson ? (
              <Input ref={newPersonRef} aria-label="Roommate’s name" value={form.assignedTo} onChange={(e) => update({ assignedTo: e.target.value })} placeholder="Roommate’s name" maxLength={50} />
            ) : null}
          </Field>

          <Field label="How often">
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_PRESETS.map((preset) => (
                <Chip key={preset.days} pressed={form.frequencyDays === preset.days} onClick={() => update({ frequencyDays: preset.days })}>{preset.label}</Chip>
              ))}
              <label htmlFor="task-custom-days" className="sr-only">Custom number of days</label>
              <input
                id="task-custom-days"
                type="number"
                min={1}
                max={365}
                placeholder="Days"
                value={isPreset ? '' : form.frequencyDays}
                onChange={(e) => update({ frequencyDays: Number(e.target.value) || 0 })}
                className={`h-8 w-24 rounded-full border px-3 text-[13px] tabular-nums ${isPreset ? 'border-line bg-surface-2' : 'border-accent bg-accent-soft'}`}
              />
            </div>
          </Field>

          <Field label="Last done">
            <div className="flex flex-wrap gap-2">
              {LAST_DONE_OPTIONS.map((option) => (
                <Chip key={option.value} pressed={form.lastDoneChoice === option.value} onClick={() => update({ lastDoneChoice: option.value })}>{option.label}</Chip>
              ))}
            </div>
            {form.lastDoneChoice === 'date' ? (
              <Input type="date" aria-label="Date last done" max={toISODate(new Date())} value={form.lastDoneDate} onChange={(e) => update({ lastDoneDate: e.target.value })} />
            ) : null}
          </Field>

          <Field label="Notes" htmlFor="task-notes" optional>
            <Textarea id="task-notes" value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Anything roommates should know" maxLength={500} />
          </Field>

          <Field label="Tags" htmlFor="task-tag" hint="Press Enter or comma to add a tag.">
            <div
              className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-ctl border border-line bg-surface-2 px-2 py-1.5 focus-within:border-accent focus-within:bg-surface focus-within:shadow-[0_0_0_3px_var(--accent-soft)]"
              onClick={() => tagRef.current?.focus()}
            >
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex h-[26px] items-center gap-0.5 rounded-pill border border-line bg-surface pr-1 pl-2.5 text-[13px]">
                  #{tag}
                  <button type="button" aria-label={`Remove ${tag}`} onClick={() => update({ tags: form.tags.filter((t) => t !== tag) })} className="grid h-5 w-5 place-items-center rounded text-subtle hover:text-ink">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                id="task-tag"
                ref={tagRef}
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
                  if (e.key === 'Backspace' && !tagDraft && form.tags.length) update({ tags: form.tags.slice(0, -1) })
                }}
                onBlur={addTag}
                placeholder={form.tags.length ? '' : 'kitchen, weekly…'}
                className="h-[30px] min-w-24 flex-1 bg-transparent text-sm"
              />
            </div>
          </Field>

          <Switch checked={form.pinned} onChange={(pinned) => update({ pinned })} label="Pin to top" description="Pinned chores lead their group." />

          {error ? <p className="rounded-ctl bg-danger-soft px-3 py-2.5 text-sm text-danger" role="alert">{error}</p> : null}
        </form>
      </SheetBody>
      <SheetFooter>
        <span className="flex-1" />
        <Button variant="secondary" onClick={requestClose}>Cancel</Button>
        <Button variant="primary" type="submit" form="task-form" disabled={!canSave} loading={saving}>{task ? 'Save changes' : 'Add chore'}</Button>
      </SheetFooter>

      <ConfirmDialog
        open={confirmDiscard}
        title={task ? 'Discard your changes?' : 'Discard this chore?'}
        message="What you typed will be lost."
        confirmLabel="Discard"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); onCancel() }}
      />
    </>
  )
}

export default function TaskModal({ open, task, me, roommates, onClose, onSave }) {
  const titleId = useId()
  // Backdrop clicks and Escape go through the form so it can ask before discarding typed text.
  const requestCloseRef = useRef(onClose)
  return (
    <Sheet open={open} onClose={() => requestCloseRef.current()} variant="modal" labelledBy={titleId}>
      <TaskForm key={task?._id || 'new'} task={task} me={me} roommates={roommates} onCancel={onClose} onSave={onSave} titleId={titleId} requestCloseRef={requestCloseRef} />
    </Sheet>
  )
}
