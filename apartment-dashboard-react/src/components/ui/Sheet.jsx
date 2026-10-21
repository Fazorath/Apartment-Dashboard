import { useEffect, useId, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import useMediaQuery from '../../hooks/useMediaQuery'
import Button from './Button'

const MotionDiv = motion.div
const MotionAside = motion.aside

// Sheets stack (a confirm dialog can sit on a drawer); Escape and focus trapping only apply to the top one.
const openStack = []
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const SPRING = { type: 'spring', stiffness: 260, damping: 28 }

const layout = (variant, isPhone) => {
  if (variant === 'dialog') {
    return {
      className: 'left-1/2 top-1/2 w-[min(400px,calc(100%-32px))] rounded-sheet border',
      motion: { initial: { opacity: 0, scale: 0.98, x: '-50%', y: '-48%' }, animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' }, exit: { opacity: 0, scale: 0.98, x: '-50%', y: '-48%' }, transition: { duration: 0.18 } },
    }
  }
  if (isPhone) {
    return {
      className: `inset-x-0 bottom-0 rounded-t-sheet pb-[env(safe-area-inset-bottom)] ${variant === 'drawer' ? 'h-[90%]' : 'max-h-[92%]'}`,
      motion: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: SPRING },
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

function SheetPanel({ onClose, variant, labelledBy, children }) {
  const id = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const isPhone = useMediaQuery('(max-width: 639px)')
  const { className, motion: anim } = layout(variant, isPhone)
  const isDialog = variant === 'dialog'

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    openStack.push(id)
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const target = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE) || panel
    target.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (openStack[openStack.length - 1] !== id) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
      }
      if (event.key === 'Tab') {
        const items = [...panel.querySelectorAll(FOCUSABLE)]
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openStack.splice(openStack.indexOf(id), 1)
      if (!openStack.length) document.body.style.overflow = ''
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true })
    }
  }, [id])

  const Panel = variant === 'drawer' ? MotionAside : MotionDiv

  return (
    <>
      <MotionDiv
        className={`fixed inset-0 bg-scrim ${isDialog ? 'z-[60]' : 'z-40'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />
      <Panel
        ref={panelRef}
        role={isDialog ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`fixed flex flex-col border-line bg-surface text-ink shadow-overlay ${isDialog ? 'z-[70]' : 'z-50'} ${className}`}
        {...anim}
      >
        {isPhone && !isDialog ? <div className="mx-auto mt-2 h-1 w-10 flex-none rounded-full bg-line" aria-hidden="true" /> : null}
        {children}
      </Panel>
    </>
  )
}

export default function Sheet({ open, onClose, variant = 'drawer', labelledBy, children }) {
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
