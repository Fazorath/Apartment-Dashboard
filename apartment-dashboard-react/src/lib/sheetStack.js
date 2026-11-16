import { useEffect, useId } from 'react'

// Sheets stack (a confirm dialog can sit on a drawer); Escape, outside taps and focus trapping only apply to the top one.
let stack = []
const emit = (next) => {
  stack = next
}

export const isTop = (id) => stack[stack.length - 1] === id
export const stackSize = () => stack.length

// Vaul (phone sheets) traps focus with a Radix focus scope; a dialog opened on top has to open its own scope to take over.
const phoneSheets = new Set()
export const markPhoneSheet = (id, on) => (on ? phoneSheets.add(id) : phoneSheets.delete(id))
export const hasPhoneSheetOpen = () => stack.some((id) => phoneSheets.has(id))

// Registers a sheet while it is open (`active`) and reports whether it is the top one.
export function useSheetStack(active = true, phone = false) {
  const id = useId()
  useEffect(() => {
    if (!active) return undefined
    markPhoneSheet(id, phone)
    emit([...stack, id])
    return () => {
      markPhoneSheet(id, false)
      emit(stack.filter((x) => x !== id))
    }
  }, [id, active, phone])
  return { id }
}
