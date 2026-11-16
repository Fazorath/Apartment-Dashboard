import { toast } from 'sonner'

export const PLAIN_TOAST_MS = 2500
export const ACTION_TOAST_MS = 5000

// One call site for every toast. `action` is { actionLabel, onAction }; running it dismisses the toast.
export function notify(message, action) {
  if (!action) return toast(message, { duration: PLAIN_TOAST_MS })
  return toast(message, {
    duration: ACTION_TOAST_MS,
    action: { label: action.actionLabel, onClick: () => action.onAction() },
  })
}
