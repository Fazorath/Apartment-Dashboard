// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Sheet from './Sheet'

const setPhone = (isPhone) => {
  window.matchMedia = (query) => ({
    matches: isPhone && query.includes('639px'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })
}

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  window.HTMLElement.prototype.setPointerCapture = () => {}
  window.HTMLElement.prototype.releasePointerCapture = () => {}
})

afterEach(() => {
  cleanup()
  document.body.removeAttribute('style')
})

const escape = () => fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' })

describe.each([
  ['phone (Vaul bottom sheet)', true],
  ['desktop (base-ui drawer)', false],
])('Sheet on %s', (_name, isPhone) => {
  it('closes on Escape', () => {
    setPhone(isPhone)
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} labelledBy="t"><h2 id="t">Chore</h2><button>Inside</button></Sheet>)
    expect(screen.getByRole('dialog')).toBeTruthy()
    escape()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus in on open and back to the opener on close', async () => {
    setPhone(isPhone)
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { rerender } = render(<Sheet open onClose={() => {}} labelledBy="t"><h2 id="t">Chore</h2><button data-autofocus>Inside</button></Sheet>)
    await vi.waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true))
    rerender(<Sheet open={false} onClose={() => {}} labelledBy="t"><h2 id="t">Chore</h2></Sheet>)
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
    opener.remove()
  })

  it('lets a confirm dialog on top take Escape, then the sheet', () => {
    setPhone(isPhone)
    const closeSheet = vi.fn()
    const closeConfirm = vi.fn()
    // Like TaskModal and SettingsSheet: the confirm is a React child of the sheet it opens over.
    const view = (
      <Sheet open onClose={closeSheet} labelledBy="s">
        <h2 id="s">Chore</h2>
        <button>Delete</button>
        <Sheet open onClose={closeConfirm} variant="dialog" labelledBy="c"><h2 id="c">Delete?</h2><button data-autofocus>Cancel</button></Sheet>
      </Sheet>
    )
    render(view)
    escape()
    expect(closeConfirm).toHaveBeenCalledTimes(1)
    expect(closeSheet).not.toHaveBeenCalled()
  })

  it('covers the sheet with its own scrim and while a confirm is open', async () => {
    setPhone(isPhone)
    render(
      <Sheet open onClose={() => {}} labelledBy="s">
        <h2 id="s">Chore</h2>
        <Sheet open onClose={() => {}} variant="dialog" labelledBy="c"><h2 id="c">Delete?</h2><button data-autofocus>Cancel</button></Sheet>
      </Sheet>,
    )
    await screen.findByRole('alertdialog')
    // The confirm's backdrop is rendered (base-ui hides nested backdrops unless forced) and sits under the confirm.
    const scrim = document.querySelector('.bg-scrim.z-\\[60\\]')
    expect(scrim).toBeTruthy()
  })

  it('returns focus into the sheet when the confirm on top closes', async () => {
    setPhone(isPhone)
    const Both = ({ confirm }) => (
      <Sheet open onClose={() => {}} labelledBy="s">
        <h2 id="s">Chore</h2>
        <button data-autofocus>Delete</button>
        <Sheet open={confirm} onClose={() => {}} variant="dialog" labelledBy="c"><h2 id="c">Delete?</h2><button data-autofocus>Cancel</button></Sheet>
      </Sheet>
    )
    const { rerender } = render(<Both confirm={false} />)
    const opener = await screen.findByText('Delete')
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
    rerender(<Both confirm />)
    await vi.waitFor(() => expect(screen.getByRole('alertdialog').contains(document.activeElement)).toBe(true))
    rerender(<Both confirm={false} />)
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
  })
})
