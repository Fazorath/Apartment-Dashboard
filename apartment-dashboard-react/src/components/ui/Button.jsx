import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:brightness-105 disabled:opacity-45 disabled:hover:brightness-100',
  secondary: 'bg-surface-2 text-ink border-line hover:border-subtle disabled:opacity-50',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  danger: 'bg-transparent text-danger hover:bg-danger-soft disabled:opacity-50',
  'danger-solid': 'bg-danger text-surface hover:brightness-105 disabled:opacity-50',
}

const SIZES = {
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-[18px] text-[15px]',
  icon: 'h-9 w-9 sm:h-9 sm:w-9 max-sm:h-11 max-sm:w-11',
}

export default function Button({ variant = 'secondary', size = 'md', loading = false, className = '', children, type = 'button', disabled, ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-ctl border border-transparent font-medium whitespace-nowrap transition-[background-color,border-color,color,filter,transform] duration-150 active:translate-y-px ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
