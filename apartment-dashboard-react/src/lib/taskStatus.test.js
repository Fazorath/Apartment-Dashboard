import { describe, expect, it } from 'vitest'
import { compareTasks } from './taskStatus'

const TODAY = new Date(2026, 9, 20) // Oct 20, local time

const chore = (name, { frequencyDays = 7, lastDone = null, pinned = false, active = true } = {}) => ({
  name,
  frequencyDays,
  lastDone,
  pinned,
  active,
})

const order = (tasks) => [...tasks].sort((a, b) => compareTasks(a, b, TODAY)).map((t) => t.name)

describe('chore ordering', () => {
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

  it('keeps pinned chores ordered by urgency among themselves', () => {
    const tasks = [
      chore('Clean filter', { frequencyDays: 30, lastDone: '2026-10-01', pinned: true }), // due in 11 days
      chore('Feed cat', { frequencyDays: 1, lastDone: '2026-10-18', pinned: true }), // 1 day overdue
      chore('Air out rugs'),
    ]
    expect(order(tasks)).toEqual(['Feed cat', 'Clean filter', 'Air out rugs'])
  })
})
