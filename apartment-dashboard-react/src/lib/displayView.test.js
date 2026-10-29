import { describe, expect, it } from 'vitest'
import { fitGroups, getDisplayView } from './displayView'

const TODAY = new Date(2026, 9, 20, 18, 30) // Tue Oct 20, evening, local time

const chore = (name, { frequencyDays = 7, lastDone = null, pinned = false, active = true, priority, assignedTo = '', lastCompleted = null, lastCompletedBy = null } = {}) => ({
  name,
  frequencyDays,
  lastDone,
  pinned,
  active,
  assignedTo,
  lastCompleted,
  lastCompletedBy,
  ...(priority && { priority }),
})

const names = (groups) => groups.flatMap((g) => g.items.map((i) => i.chore.name))

describe('Display view sections', () => {
  it('puts overdue and due-today chores in Today, with overdue flagged and counted', () => {
    const view = getDisplayView([
      chore('Vacuum', { lastDone: '2026-10-10' }), // due Oct 17, 3 days overdue
      chore('Dishes', { lastDone: '2026-10-13' }), // due today
    ], TODAY)
    const items = view.today.flatMap((g) => g.items)
    expect(items.find((i) => i.chore.name === 'Vacuum')).toMatchObject({ overdue: true, overdueDays: 3 })
    expect(items.find((i) => i.chore.name === 'Dishes')).toMatchObject({ overdue: false, overdueDays: 0 })
    expect(view.week).toEqual([])
  })

  it('flags a never-done chore as overdue without a day count', () => {
    const [group] = getDisplayView([chore('Oven')], TODAY).today
    expect(group.items[0]).toMatchObject({ overdue: true, overdueDays: null })
  })

  it('puts chores due in 1 to 6 days in This week with their due day', () => {
    const view = getDisplayView([
      chore('Tomorrow', { lastDone: '2026-10-14' }), // due Oct 21
      chore('Six out', { lastDone: '2026-10-19' }), // due Oct 26
    ], TODAY)
    expect(view.today).toEqual([])
    const items = view.week.flatMap((g) => g.items)
    expect(items.map((i) => i.chore.name)).toEqual(['Tomorrow', 'Six out'])
    expect(items[0].dueDate).toEqual(new Date(2026, 9, 21))
    expect(items[1].dueDate).toEqual(new Date(2026, 9, 26))
  })

  it('leaves out later and paused chores', () => {
    const view = getDisplayView([
      chore('Seven out', { lastDone: '2026-10-20' }), // due Oct 27
      chore('Paused overdue', { lastDone: '2026-09-01', active: false }),
      chore('Shown', { lastDone: '2026-10-13' }),
    ], TODAY)
    expect(names(view.today)).toEqual(['Shown'])
    expect(view.week).toEqual([])
  })

  it('orders assignees alphabetically with unassigned last', () => {
    const view = getDisplayView([
      chore('A', { lastDone: '2026-10-01' }),
      chore('B', { lastDone: '2026-10-01', assignedTo: 'zoe' }),
      chore('C', { lastDone: '2026-10-01', assignedTo: 'Alex' }),
      chore('D', { lastDone: '2026-10-01', assignedTo: ' alex ' }),
    ], TODAY)
    expect(view.today.map((g) => g.assignee)).toEqual(['Alex', 'zoe', null])
    expect(names([view.today[0]])).toEqual(['C', 'D'])
  })

  it('marks chores done today, with who did it, in Today', () => {
    const view = getDisplayView([
      chore('Dishes', { frequencyDays: 3, lastDone: '2026-10-20', lastCompleted: '2026-10-20', lastCompletedBy: 'Sam' }),
      chore('Trash', { frequencyDays: 30, lastDone: '2026-10-20', lastCompleted: '2026-10-20', lastCompletedBy: 'Alex' }),
      chore('Paused', { lastDone: '2026-10-20', lastCompleted: '2026-10-20', active: false }),
    ], TODAY)
    expect(view.week).toEqual([])
    expect(view.today[0].items.map((i) => [i.chore.name, i.doneToday, i.doneBy])).toEqual([
      ['Dishes', true, 'Sam'],
      ['Trash', true, 'Alex'],
    ])
  })

  it('gives the right sections the next day', () => {
    const chores = [
      chore('Tomorrow', { lastDone: '2026-10-14' }), // due Oct 21
      chore('Later', { lastDone: '2026-10-20' }), // due Oct 27
    ]
    const tomorrow = new Date(2026, 9, 21, 0, 5)
    expect(names(getDisplayView(chores, TODAY).week)).toEqual(['Tomorrow'])
    const next = getDisplayView(chores, tomorrow)
    expect(names(next.today)).toEqual(['Tomorrow'])
    expect(names(next.week)).toEqual(['Later'])
  })

  it('orders a group like the default due sort', () => {
    const view = getDisplayView([
      chore('Plain overdue', { lastDone: '2026-10-01' }),
      chore('Pinned', { lastDone: '2026-10-13', pinned: true }),
      chore('High', { lastDone: '2026-10-13', priority: 'high' }),
    ], TODAY)
    expect(names(view.today)).toEqual(['Pinned', 'High', 'Plain overdue'])
  })
})

describe('fitting groups into a row budget', () => {
  const group = (assignee, count) => ({ assignee, items: Array.from({ length: count }, (_, i) => ({ id: `${assignee}${i}` })) })

  it('keeps everything when it fits', () => {
    const groups = [group('Alex', 2), group(null, 1)] // 3 + 2 rows
    expect(fitGroups(groups, 5)).toEqual({ groups, more: 0 })
  })

  it('cuts off what does not fit and counts it, leaving a row for the count', () => {
    const { groups, more } = fitGroups([group('Alex', 5), group('Sam', 3)], 5)
    // heading + 3 chores + the "+N more" row
    expect(groups.map((g) => [g.assignee, g.items.length])).toEqual([['Alex', 3]])
    expect(more).toBe(5)
  })

  it('never shows a heading without a chore under it', () => {
    const { groups, more } = fitGroups([group('Alex', 2), group('Sam', 3)], 4)
    expect(groups.map((g) => g.assignee)).toEqual(['Alex'])
    expect(groups[0].items).toHaveLength(2)
    expect(more).toBe(3)
  })
})
