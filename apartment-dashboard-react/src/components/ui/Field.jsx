const CONTROL = 'w-full rounded-ctl bg-surface-2 border border-line px-3 text-sm text-ink transition-[border-color,background-color,box-shadow] duration-150 hover:border-subtle focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-60 disabled:hover:border-line'

export function Field({ label, htmlFor, hint, error, optional = false, children, className = '' }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      {label ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
          {label}
          {optional ? <span className="font-normal text-subtle"> (optional)</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="text-xs text-danger" role="alert">{error}</p> : hint ? <p className="text-xs text-subtle">{hint}</p> : null}
    </div>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={`${CONTROL} h-11 ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${CONTROL} min-h-24 resize-y py-2.5 leading-5 ${className}`} {...props} />
}
