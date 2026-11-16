import { useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import { Dialog } from '@base-ui/react/dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import useMediaQuery from '../../hooks/useMediaQuery'
import Button from './Button'

const MotionDiv = motion.div
const MotionAside = motion.aside

const SPRING = { type: 'spring', stiffness: 260, damping: 28 }

const layout = (variant) => {
  if (variant === 'dialog') {
    return {
      className: 'left-1/2 top-1/2 w-[min(400px,calc(100%-32px))] rounded-sheet border',
      motion: { initial: { opacity: 0, scale: 0.98, x: '-50%', y: '-48%' }, animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' }, exit: { opacity: 0, scale: 0.98, x: '-50%', y: '-48%' }, transition: { duration: 0.18 } },
    }
  }
  if (variant === 'drawer') {
    return {
      className: 'inset-y-0 right-0 w-[480px] border-l',
      motion: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: SPRING },
    }
  }
  return {
    className: 'left-1/2 top-1/2 w-[min(560px,calc(100%-32px))] max-h-[calc(100%-48px)] rounded-sheet border',
    motion: { initial: { opacity: 0, scale: 0.98, x: '-50%', y: '-48%' }, animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' }, exit: { opacity: 0, scale: 0.98, x: '-50%', y: '-48%' }, transition: { duration: 0.2, ease: 'easeOut' } },
  }
}

// Desktop drawer, centered modal and confirm dialog: base-ui Dialog does the focus trap, Escape, outside press,
// scroll lock and focus return. framer-motion keeps the spring: AnimatePresence holds the panel through its exit.
function SheetPanel({ onClose, variant, labelledBy, children }) {
  const panelRef = useRef(null)
  const { className, motion: anim } = layout(variant)
  const isDialog = variant === 'dialog'
  const Panel = variant === 'drawer' ? MotionAside : MotionDiv

  return (
    <Dialog.Root open onOpenChange={(next) => { if (!next) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop
          render={(
            <MotionDiv
              className={`pointer-events-auto fixed inset-0 bg-scrim ${isDialog ? 'z-[60]' : 'z-40'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
          )}
        />
        <Dialog.Popup
          role={isDialog ? 'alertdialog' : 'dialog'}
          aria-labelledby={labelledBy}
          initialFocus={() => panelRef.current?.querySelector('[data-autofocus]') ?? true}
          render={(
            <Panel
              ref={panelRef}
              className={`pointer-events-auto fixed flex flex-col border-line bg-surface text-ink shadow-overlay ${isDialog ? 'z-[70]' : 'z-50'} ${className}`}
              {...anim}
            />
          )}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Phone bottom sheet: Vaul gives drag-to-close, backdrop tap, Escape, focus-in and focus-return.
// A dialog on top (a confirm) owns Escape and outside taps, so this one stands down while one is open.
const dialogOnTop = () => Boolean(document.querySelector('[role="alertdialog"]'))
function PhoneSheet({ open, onClose, variant, labelledBy, children }) {
  // Vaul has no Drawer.Trigger here (sheets open from state), so Radix has nothing to return focus to.
  const returnFocusTo = useRef(null)

  // Workaround: Vaul's Radix focus trap pulls focus back from a base-ui dialog opened on top. Focus moving into
  // a dialog never reaches the trap's document listeners, so the dialog keeps focus and Vaul's trap resumes when it closes.
  useEffect(() => {
    if (!open) return undefined
    const inDialog = (el) => Boolean(el?.closest?.('[role="alertdialog"]'))
    const shieldIn = (event) => { if (inDialog(event.target)) event.stopPropagation() }
    const shieldOut = (event) => { if (inDialog(event.relatedTarget)) event.stopPropagation() }
    window.addEventListener('focusin', shieldIn, true)
    window.addEventListener('focusout', shieldOut, true)
    return () => {
      window.removeEventListener('focusin', shieldIn, true)
      window.removeEventListener('focusout', shieldOut, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    returnFocusTo.current = document.activeElement
    return () => {
      const el = returnFocusTo.current
      if (el && document.contains(el)) el.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <Drawer.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          aria-labelledby={labelledBy}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            const target = event.currentTarget.querySelector('[data-autofocus]')
            if (target) {
              event.preventDefault()
              target.focus({ preventScroll: true })
            }
          }}
          onEscapeKeyDown={(event) => { if (dialogOnTop()) event.preventDefault() }}
          onInteractOutside={(event) => { if (dialogOnTop()) event.preventDefault() }}
          className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-sheet border border-line bg-surface pb-[env(safe-area-inset-bottom)] text-ink shadow-overlay ${variant === 'drawer' ? 'h-[90%]' : 'max-h-[92%]'}`}
        >
          <div className="mx-auto mt-2 h-1 w-10 flex-none rounded-full bg-line" aria-hidden="true" />
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export default function Sheet({ open, onClose, variant = 'drawer', labelledBy, children }) {
  const isPhone = useMediaQuery('(max-width: 639px)')
  if (isPhone && variant !== 'dialog') {
    return <PhoneSheet open={open} onClose={onClose} variant={variant} labelledBy={labelledBy}>{children}</PhoneSheet>
  }
  return (
    <AnimatePresence>
      {open ? (
        <SheetPanel onClose={onClose} variant={variant} labelledBy={labelledBy}>
          {children}
        </SheetPanel>
      ) : null}
    </AnimatePresence>
  )
}

export function SheetHeader({ id, title, onClose, actions, children }) {
  return (
    <div className="flex flex-none items-start gap-3 border-b border-line px-5 pt-[18px] pb-3.5">
      <div className="min-w-0">
        <h2 id={id} className="text-xl leading-7 font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</h2>
        {children}
      </div>
      <div className="ml-auto flex flex-none items-center gap-1">
        {actions}
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X size={18} />
        </Button>
      </div>
    </div>
  )
}

export function SheetBody({ className = '', children }) {
  return <div className={`grid flex-1 content-start gap-[22px] overflow-y-auto p-5 ${className}`}>{children}</div>
}

export function SheetFooter({ children }) {
  return <div className="flex flex-none items-center gap-2 border-t border-line px-5 py-3.5">{children}</div>
}
