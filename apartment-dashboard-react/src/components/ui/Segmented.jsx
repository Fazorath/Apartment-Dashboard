export default function Segmented({ options, value, onChange, label, className = '', stretch = false }) {
  return (
    <div role="group" aria-label={label} className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-ctl border border-line bg-surface-2 p-[3px] ${stretch ? 'w-full' : ''} ${className}`}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`h-[30px] rounded-[7px] px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${stretch ? 'flex-1' : ''} ${
              active ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]' : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined ? <span className="ml-1 text-subtle tabular-nums">{option.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
