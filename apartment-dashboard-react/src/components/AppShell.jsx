import { useEffect, useRef, useState } from 'react'
import { House, LogOut, Plus, Search, Settings } from 'lucide-react'
import Avatar from './ui/Avatar'
import Button from './ui/Button'
import Segmented from './ui/Segmented'
import useTheme, { THEME_OPTIONS } from '../hooks/useTheme'

function AccountMenu({ name, homeName, homeCode, onOpenSettings, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event) => { if (!ref.current.contains(event.target)) setOpen(false) }
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left hover:bg-surface-2'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-11 w-11 place-items-center rounded-full"
      >
        <Avatar name={name} size="md" />
      </button>
      {open ? (
        <div role="menu" className="absolute top-[calc(100%+4px)] right-0 z-30 w-60 rounded-card border border-line bg-surface p-1.5 shadow-overlay">
          <div className="mb-1.5 border-b border-line px-2.5 pt-2.5 pb-3">
            <b className="block font-semibold">{name}</b>
            <span className="text-xs text-subtle">{homeName} · {homeCode}</span>
          </div>
          <div className="px-2.5 pt-2 pb-2.5">
            <p className="mb-1.5 text-xs font-medium text-muted">Theme</p>
            <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} label="Theme" stretch />
          </div>
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onOpenSettings() }}>
            <Settings size={16} /> Settings
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onSignOut() }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function AppShell({ homeName, homeCode, userName, search, onSearchChange, searchRef, onAddTask, onOpenSettings, onSignOut, children }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const showSearch = onSearchChange !== undefined

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 max-sm:gap-2 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-accent text-on-accent"><House size={18} /></div>
            <div className="min-w-0">
              <p className="truncate text-[17px] leading-[22px] font-bold tracking-tight">{homeName}</p>
              <p className="text-xs text-subtle">Roommate Dash · <span className="font-semibold tracking-[0.06em] text-muted tabular-nums">{homeCode}</span></p>
            </div>
          </div>

          {showSearch ? (
            <div className={`relative ml-auto max-w-[360px] flex-1 ${searchOpen ? 'max-sm:absolute max-sm:inset-x-4 max-sm:top-3 max-sm:z-10 max-sm:ml-0 max-sm:max-w-none' : 'max-sm:hidden'}`}>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
              <label htmlFor="task-search" className="sr-only">Search chores</label>
              <input
                id="task-search"
                ref={searchRef}
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onBlur={() => { if (!search) setSearchOpen(false) }}
                placeholder="Search chores, people, tags"
                autoComplete="off"
                className="h-[38px] w-full rounded-ctl border border-line bg-surface-2 pr-9 pl-9 text-sm transition-[border-color,background-color,box-shadow] duration-150 hover:border-subtle focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              />
              <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-[5px] border border-line px-1.5 text-[11px] leading-[18px] text-subtle max-sm:hidden">/</kbd>
            </div>
          ) : null}

          <div className={`flex items-center gap-2 ${showSearch ? '' : 'ml-auto'} max-sm:ml-auto`}>
            {showSearch ? (
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Search" onClick={() => { setSearchOpen(true); setTimeout(() => searchRef?.current?.focus(), 0) }}>
                <Search size={20} />
              </Button>
            ) : null}
            {onAddTask ? <Button variant="primary" className="max-sm:hidden" onClick={onAddTask}><Plus size={16} /> Add task</Button> : null}
            <AccountMenu name={userName} homeName={homeName} homeCode={homeCode} onOpenSettings={onOpenSettings} onSignOut={onSignOut} />
          </div>
        </div>
      </header>

      {children}

      {onAddTask ? (
        <button
          type="button"
          onClick={onAddTask}
          aria-label="Add task"
          className="fixed right-[calc(20px+env(safe-area-inset-right))] bottom-[calc(20px+env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-[18px] bg-accent text-on-accent shadow-overlay sm:hidden"
        >
          <Plus size={22} />
        </button>
      ) : null}
    </div>
  )
}
