const DAY_MS = 24 * 60 * 60 * 1000

export const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Dates picked in the task form are sent as "YYYY-MM-DD" and stored as UTC midnight.
// Read those as calendar dates, otherwise they shift back a day west of Greenwich.
export const toLocalDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const isUtcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0
  if (isUtcMidnight) return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return startOfDay(d)
}

export const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS)

export const addDays = (date, days) => {
  const d = startOfDay(date)
  d.setDate(d.getDate() + days)
  return d
}

// "YYYY-MM-DD" in local time, for <input type="date"> and for the API.
export const toISODate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const formatShortDate = (date) => `${MONTHS[date.getMonth()]} ${date.getDate()}`

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export const SOON_DAYS = 2
export const DONE_WINDOW_DAYS = 7

export const GROUPS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'soon', label: 'Due soon' },
  { id: 'ontrack', label: 'On track' },
  { id: 'done', label: 'Done this week' },
]

/**
 * The single source of truth for a task's due state.
 * group: 'overdue' | 'soon' | 'ontrack' | 'done'
 * tone:  'overdue' | 'soon' | 'done' | 'neutral' | 'paused' (drives pill colour)
 */
export const getTaskStatus = (task, today = new Date()) => {
  if (task.active === false) {
    return { group: 'ontrack', tone: 'paused', label: 'Paused', daysUntilDue: Infinity, dueDate: null }
  }

  const lastDone = toLocalDate(task.lastDone)
  if (!lastDone) {
    return { group: 'overdue', tone: 'overdue', label: 'Never done', daysUntilDue: -Infinity, dueDate: startOfDay(today) }
  }

  const daysUntilDue = task.frequencyDays - daysBetween(lastDone, today)
  const dueDate = addDays(lastDone, task.frequencyDays)
  const base = { daysUntilDue, dueDate }

  if (daysUntilDue < 0) return { ...base, group: 'overdue', tone: 'overdue', label: `${plural(-daysUntilDue, 'day')} overdue` }
  if (daysUntilDue === 0) return { ...base, group: 'overdue', tone: 'overdue', label: 'Due today' }
  if (daysUntilDue <= SOON_DAYS) {
    return { ...base, group: 'soon', tone: 'soon', label: daysUntilDue === 1 ? 'Due tomorrow' : `In ${daysUntilDue} days` }
  }

  const completed = toLocalDate(task.lastCompleted)
  const daysSinceCompleted = completed ? daysBetween(completed, today) : null
  if (daysSinceCompleted !== null && daysSinceCompleted < DONE_WINDOW_DAYS) {
    const label = daysSinceCompleted === 0 ? 'Done today' : daysSinceCompleted === 1 ? 'Done yesterday' : `Done ${daysSinceCompleted} days ago`
    return { ...base, group: 'done', tone: 'done', label }
  }

  return { ...base, group: 'ontrack', tone: 'neutral', label: `In ${daysUntilDue} days` }
}

export const isDoneToday = (task, today = new Date()) => {
  const completed = toLocalDate(task.lastCompleted)
  return Boolean(completed) && daysBetween(completed, today) === 0
}

export const lastDoneText = (task, today = new Date()) => {
  const lastDone = toLocalDate(task.lastDone)
  if (!lastDone) return 'never done'
  const days = daysBetween(lastDone, today)
  if (days === 0) return 'done today'
  if (days === 1) return 'done yesterday'
  return `done ${days} days ago`
}

export const frequencyText = (days) => {
  if (days === 1) return 'Every day'
  if (days === 7) return 'Every week'
  if (days === 14) return 'Every 2 weeks'
  if (days === 30) return 'Every month'
  return `Every ${days} days`
}

// Pinned first, then most urgent, then alphabetical.
export const compareTasks = (a, b, today = new Date()) =>
  (Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))) ||
  (getTaskStatus(a, today).daysUntilDue - getTaskStatus(b, today).daysUntilDue) ||
  a.name.localeCompare(b.name)
