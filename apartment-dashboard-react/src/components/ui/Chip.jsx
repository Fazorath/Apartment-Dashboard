export default function Chip({ pressed = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150 ${
        pressed ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted hover:border-subtle hover:text-ink'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
