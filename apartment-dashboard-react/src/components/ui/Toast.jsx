import { AnimatePresence, motion } from 'framer-motion'

const MotionDiv = motion.div

// Controlled by the parent: pass `toast` ({ id, message, actionLabel?, onAction? }) or null.
export default function Toast({ toast, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 max-sm:bottom-[calc(88px+env(safe-area-inset-bottom))]" role="status" aria-live="polite">
      <AnimatePresence>
        {toast ? (
          <MotionDiv
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex max-w-full items-center gap-3 rounded-xl bg-ink py-2 pr-2 pl-4 text-bg shadow-overlay"
          >
            <span className="truncate">{toast.message}</span>
            {toast.actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  toast.onAction()
                  onDismiss()
                }}
                className="h-8 flex-none rounded-lg bg-bg/15 px-3 font-semibold text-bg hover:bg-bg/25"
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
