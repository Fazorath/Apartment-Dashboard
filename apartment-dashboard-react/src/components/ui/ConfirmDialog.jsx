import { useId } from 'react'
import Sheet from './Sheet'
import Button from './Button'

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, busy = false }) {
  const titleId = useId()
  return (
    <Sheet open={open} onClose={onCancel} variant="dialog" labelledBy={titleId}>
      <div className="grid gap-2 px-6 pt-6 pb-2">
        <h2 id={titleId} className="text-lg leading-6 font-semibold">{title}</h2>
        <p className="text-muted">{message}</p>
      </div>
      <div className="flex justify-end gap-2 px-6 pt-4 pb-5">
        <Button variant="secondary" onClick={onCancel} data-autofocus>Cancel</Button>
        <Button variant="danger-solid" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
      </div>
    </Sheet>
  )
}
