import { describe, expect, it } from 'vitest'
import { sortTasks, toSortKey } from './taskStatus'

const TODAY = new Date(2026, 9, 20) // Oct 20, local time

const chore = (name, { frequencyDays = 7, lastDone = null, pinned = false, active = true, priority } = {}) => ({
  name,
  frequencyDays,
  lastDone,
  pinned,
  active,
  ...(priority && { priority }),
})

const order = (tasks, sortKey = 'due') => sortTasks(tasks, sortKey, TODAY).map((t) => t.name)

describe('sorting by due date', () => {
  it('puts pinned chores before more urgent unpinned ones', () => {
    const tasks = [
      chore('Mop floors', { lastDone: '2026-10-01' }), // 12 days overdue
      chore('Water plant', { lastDone: '2026-10-19', pinned: true }), // due in 6 days
    ]
    expect(order(tasks)).toEqual(['Water plant', 'Mop floors'])
  })

  it('puts overdue chores before chores due soon', () => {
    const tasks = [
      chore('Take out trash', { lastDone: '2026-10-15' }), // due in 2 days
      chore('Clean bathroom', { lastDone: '2026-10-10' }), // 3 days overdue
      chore('Vacuum', { lastDone: '2026-10-12' }), // 1 day overdue
    ]
    expect(order(tasks)).toEqual(['Clean bathroom', 'Vacuum', 'Take out trash'])
  })

  it('falls back to name when urgency is equal', () => {
    const tasks = [
      chore('Wipe counters', { lastDone: '2026-10-16' }),
      chore('Dust shelves', { lastDone: '2026-10-16' }),
      chore('Laundry', { frequencyDays: 3, lastDone: '2026-10-20' }), // also due in 3 days
    ]
    expect(order(tasks)).toEqual(['Dust shelves', 'Laundry', 'Wipe counters'])
  })

  it('puts never-done chores first, in name order', () => {
    const tasks = [
      chore('Air filter', { lastDone: '2026-09-01' }), // very overdue
      chore('Mop floors'),
      chore('Defrost freezer'),
      chore('Clean oven'),
    ]
    expect(order(tasks)).toEqual(['Clean oven', 'Defrost freezer', 'Mop floors', 'Air filter'])
  })

  it('puts paused chores last, in name order', () => {
    const tasks = [
      chore('Water garden', { active: false }),
      chore('Wash car', { frequencyDays: 30, lastDone: '2026-10-19' }),
      chore('Clean grill', { active: false }),
    ]
    expect(order(tasks)).toEqual(['Wash car', 'Clean grill', 'Water garden'])
  })

  it('puts higher-priority chores before more urgent lower-priority ones', () => {
    const tasks = [
      chore('Mop floors', { lastDone: '2026-10-01' }), // 12 days overdue, normal
      chore('Water plant', { lastDone: '2026-10-19', priority: 'low' }), // due in 6 days
      chore('Pay rent', { lastDone: '2026-10-19', priority: 'high' }), // due in 6 days
      chore('Dust shelves', { lastDone: '2026-10-05', priority: 'low' }), // 8 days overdue
    ]
    expect(order(tasks)).toEqual(['Pay rent', 'Mop floors', 'Dust shelves', 'Water plant'])
  })

  it('keeps pinned chores ahead of higher-priority unpinned ones', () => {
    const tasks = [
      chore('Pay rent', { priority: 'high' }),
      chore('Water plant', { lastDone: '2026-10-19', pinned: true, priority: 'low' }),
    ]
    expect(order(tasks)).toEqual(['Water plant', 'Pay rent'])
  })

  it('keeps pinned chores ordered by urgency among themselves', () => {
    const tasks = [
      chore('Clean filter', { frequencyDays: 30, lastDone: '2026-10-01', pinned: true }), // due in 11 days
      chore('Feed cat', { frequencyDays: 1, lastDone: '2026-10-18', pinned: true }), // 1 day overdue
      chore('Air out rugs'),
    ]
    expect(order(tasks)).toEqual(['Feed cat', 'Clean filter', 'Air out rugs'])
  })
})

describe('sorting by name', () => {
  it('orders alphabetically regardless of urgency, pinned chores first', () => {
    const tasks = [
      chore('Vacuum', { lastDone: '2026-10-01' }), // very overdue
      chore('Take out trash', { lastDone: '2026-10-19', pinned: true }),
      chore('Dust shelves', { lastDone: '2026-10-19' }),
      chore('Air filter', { frequencyDays: 30, lastDone: '2026-10-19', pinned: true }),
    ]
    expect(order(tasks, 'name')).toEqual(['Air filter', 'Take out trash', 'Dust shelves', 'Vacuum'])
  })

  it('breaks a name tie by urgency', () => {
    const tasks = [
      chore('Water plant', { lastDone: '2026-10-19' }), // due in 6 days
      chore('Water plant', { lastDone: '2026-10-10' }), // 3 days overdue
    ]
    expect(sortTasks(tasks, 'name', TODAY).map((t) => t.lastDone)).toEqual(['2026-10-10', '2026-10-19'])
  })
})

describe('sorting by assignee', () => {
  it('groups chores by assignee, unassigned last, then by chore name', () => {
    const tasks = [
      chore('Water plant'),
      { ...chore('Vacuum'), assignedTo: 'sam' },
      { ...chore('Mop floors'), assignedTo: '  ' },
      { ...chore('Dishes'), assignedTo: 'Alex' },
      { ...chore('Clean oven'), assignedTo: 'Sam' },
      { ...chore('Laundry'), assignedTo: 'Alex' },
    ]
    expect(order(tasks, 'assignee')).toEqual(['Dishes', 'Laundry', 'Clean oven', 'Vacuum', 'Mop floors', 'Water plant'])
  })

  it('keeps pinned chores first, even when unassigned', () => {
    const tasks = [
      { ...chore('Dishes'), assignedTo: 'Alex' },
      chore('Feed cat', { pinned: true }),
    ]
    expect(order(tasks, 'assignee')).toEqual(['Feed cat', 'Dishes'])
  })
})

describe('sorting by recently done', () => {
  it('puts the most recently done first and never-done chores last', () => {
    const tasks = [
      chore('Mop floors'),
      chore('Vacuum', { lastDone: '2026-10-12' }),
      chore('Dishes', { frequencyDays: 1, lastDone: '2026-10-20' }),
      chore('Clean oven'),
      chore('Laundry', { lastDone: '2026-10-18' }),
    ]
    expect(order(tasks, 'recent')).toEqual(['Dishes', 'Laundry', 'Vacuum', 'Clean oven', 'Mop floors'])
  })

  it('treats chores done on the same day as a tie, broken by name', () => {
    const tasks = [
      chore('Wipe counters', { lastDone: new Date(2026, 9, 19, 21, 30).toISOString() }),
      chore('Dust shelves', { lastDone: '2026-10-19' }),
    ]
    expect(order(tasks, 'recent')).toEqual(['Dust shelves', 'Wipe counters'])
  })

  it('keeps pinned chores first, even when never done', () => {
    const tasks = [
      chore('Dishes', { lastDone: '2026-10-20' }),
      chore('Feed cat', { pinned: true }),
    ]
    expect(order(tasks, 'recent')).toEqual(['Feed cat', 'Dishes'])
  })
})

describe('sorting by priority', () => {
  it('orders high, then normal, then low, each by urgency, pinned chores first', () => {
    const tasks = [
      chore('Water plant', { lastDone: '2026-10-01', priority: 'low' }), // 12 days overdue
      chore('Vacuum', { lastDone: '2026-10-19' }), // due in 6 days
      chore('Pay rent', { lastDone: '2026-10-19', priority: 'high' }), // due in 6 days
      chore('Mop floors', { lastDone: '2026-10-12', priority: 'normal' }), // 1 day overdue
      chore('Clean grill', { lastDone: '2026-10-19', pinned: true, priority: 'low' }),
      chore('Fix leak', { lastDone: '2026-10-10', priority: 'high' }), // 3 days overdue
    ]
    expect(order(tasks, 'priority')).toEqual(['Clean grill', 'Fix leak', 'Pay rent', 'Mop floors', 'Vacuum', 'Water plant'])
  })

  it('treats an unknown priority as normal', () => {
    const tasks = [
      chore('Vacuum', { lastDone: '2026-10-19', priority: 'urgent' }),
      chore('Dust shelves', { lastDone: '2026-10-19', priority: 'low' }),
      chore('Mop floors', { lastDone: '2026-10-19' }),
    ]
    expect(order(tasks, 'priority')).toEqual(['Mop floors', 'Vacuum', 'Dust shelves'])
  })
})

describe('choosing a sort key', () => {
  it('keeps a known stored sort key', () => {
    expect(['due', 'name', 'assignee', 'recent', 'priority'].map(toSortKey)).toEqual(['due', 'name', 'assignee', 'recent', 'priority'])
  })

  it('falls back to due date when nothing or something unknown is stored', () => {
    expect([null, undefined, '', 'high', 'toString'].map(toSortKey)).toEqual(['due', 'due', 'due', 'due', 'due'])
  })

  it('sorts by due date when given an unknown key', () => {
    const tasks = [
      chore('Air filter', { lastDone: '2026-10-19' }),
      chore('Vacuum', { lastDone: '2026-10-10' }),
    ]
    expect(order(tasks, 'bogus')).toEqual(['Vacuum', 'Air filter'])
  })
})
