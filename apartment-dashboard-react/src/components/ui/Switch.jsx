export default function Switch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>
        <span className="block font-medium">{label}</span>
        {description ? <span className="text-xs text-subtle">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[26px] w-11 flex-none rounded-full transition-colors duration-150 ${checked ? 'bg-accent' : 'bg-line'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-200 ${checked ? 'translate-x-[18px]' : ''}`}
        />
      </button>
    </div>
  )
}
