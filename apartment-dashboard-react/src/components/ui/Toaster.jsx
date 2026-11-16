import { Toaster as SonnerToaster } from 'sonner'

// Sonner, restyled with the dashboard tokens. On phones the stack sits above the tab bar.
const TAB_BAR_CLEARANCE = 'calc(88px + env(safe-area-inset-bottom))'
const DESKTOP_OFFSET = 'calc(24px + env(safe-area-inset-bottom))'

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={{ bottom: DESKTOP_OFFSET, left: 16, right: 16 }}
      mobileOffset={{ bottom: TAB_BAR_CLEARANCE, left: 16, right: 16 }}
      className="dashboard-toaster"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'flex w-full items-center gap-3 rounded-xl bg-ink py-2 pr-2 pl-4 text-bg shadow-overlay',
          title: 'min-w-0 flex-1 truncate',
          actionButton: 'h-8 flex-none rounded-lg bg-bg/15 px-3 font-semibold text-bg hover:bg-bg/25',
        },
      }}
    />
  )
}
