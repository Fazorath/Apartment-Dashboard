import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { ACTION_TOAST_MS, PLAIN_TOAST_MS, notify } from './notify'

vi.mock('sonner', () => ({ toast: vi.fn() }))

describe('notify', () => {
  beforeEach(() => vi.mocked(toast).mockClear())

  it('shows a plain message with no action button', () => {
    notify('Saved “Dishes”')
    expect(toast).toHaveBeenCalledWith('Saved “Dishes”', { duration: PLAIN_TOAST_MS })
  })

  it('keeps an action toast up for the undo window and runs the action when pressed', () => {
    const onAction = vi.fn()
    notify('Marked “Dishes” done', { actionLabel: 'Undo', onAction })

    const [message, options] = vi.mocked(toast).mock.calls[0]
    expect(message).toBe('Marked “Dishes” done')
    expect(options.duration).toBe(ACTION_TOAST_MS)
    expect(options.action.label).toBe('Undo')

    options.action.onClick()
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
