import { daysBetween, getTaskStatus, isDoneToday, sortTasks } from './taskStatus'

// How many days after today the "This week" section reaches. A rolling window, so
// nothing drops off on a Sunday night.
export const WEEK_DAYS = 6

const assigneeName = (chore) => (chore.assignedTo || '').trim()

const toItem = (chore, today) => {
  const status = getTaskStatus(chore, today)
  const doneToday = isDoneToday(chore, today)
  const overdue = !doneToday && status.group === 'overdue' && status.daysUntilDue < 0
  return {
    chore,
    overdue,
    // null for a never-done Chore, which has no meaningful count
    overdueDays: overdue ? (Number.isFinite(status.daysUntilDue) ? -status.daysUntilDue : null) : 0,
    doneToday,
    doneBy: doneToday ? chore.lastCompletedBy || null : null,
    dueDate: status.dueDate,
  }
}

// Named Assignees alphabetically (case-insensitive), then the unassigned Chores.
// Inside a group the Chores keep the dashboard's default `due` order.
const groupByAssignee = (chores, today) => {
  const groups = new Map()
  for (const chore of sortTasks(chores, 'due', today)) {
    const name = assigneeName(chore)
    const key = name.toLowerCase()
    if (!groups.has(key)) groups.set(key, { assignee: name || null, items: [] })
    groups.get(key).items.push(toItem(chore, today))
  }
  return [...groups.entries()]
    .sort(([a], [b]) => Number(!a) - Number(!b) || a.localeCompare(b))
    .map(([, group]) => group)
}

/**
 * What the Display shows: { today, week }, each a list of { assignee, items }.
 * Today holds everything overdue or due today, plus Chores already done today.
 * Paused Chores and Chores due after the week never appear.
 */
export const getDisplayView = (chores, now = new Date()) => {
  const today = []
  const week = []
  for (const chore of chores) {
    if (chore.active === false) continue
    if (isDoneToday(chore, now)) {
      today.push(chore)
      continue
    }
    const { dueDate } = getTaskStatus(chore, now)
    const days = daysBetween(now, dueDate)
    if (days <= 0) today.push(chore)
    else if (days <= WEEK_DAYS) week.push(chore)
  }
  return { today: groupByAssignee(today, now), week: groupByAssignee(week, now) }
}

/**
 * Cuts groups down to a row budget (a heading is a row, so is each Chore) so the page
 * never has to scroll. When something is cut, the last row is left for "+N more".
 */
export const fitGroups = (groups, maxRows) => {
  const rows = (group) => 1 + group.items.length
  const total = groups.reduce((sum, group) => sum + rows(group), 0)
  if (total <= maxRows) return { groups, more: 0 }

  const kept = []
  let left = maxRows - 1
  let shown = 0
  for (const group of groups) {
    if (left < 2) break // a heading needs at least one Chore under it
    const items = group.items.slice(0, Math.min(group.items.length, left - 1))
    kept.push({ ...group, items })
    shown += items.length
    left -= 1 + items.length
  }
  const all = groups.reduce((sum, group) => sum + group.items.length, 0)
  return { groups: kept, more: all - shown }
}
