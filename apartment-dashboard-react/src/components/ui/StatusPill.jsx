const TONES = {
  overdue: 'bg-danger-soft text-danger',
  soon: 'bg-warning-soft text-warning',
  done: 'bg-accent-soft text-accent',
  neutral: 'bg-surface-2 text-muted',
  paused: 'bg-surface-2 text-subtle',
}

// The leading dot keeps the state readable in grayscale; the label always says it in words.
export default function StatusPill({ status, className = '' }) {
  return (
    <span className={`inline-flex h-6 items-center justify-center gap-1.5 rounded-pill px-2.5 text-xs font-medium whitespace-nowrap ${TONES[status.tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 bg-current ${status.tone === 'paused' ? 'rounded-[1px]' : 'rounded-full'}`} aria-hidden="true" />
      {status.label}
    </span>
  )
}
