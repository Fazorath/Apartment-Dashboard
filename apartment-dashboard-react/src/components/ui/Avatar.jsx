import { initials, personColor } from '../../lib/people'

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
}

export default function Avatar({ name, size = 'sm', className = '' }) {
  if (!name) {
    return <span title="Unassigned" className={`inline-block flex-none rounded-full border-[1.5px] border-dashed border-subtle ${SIZES[size]} ${className}`} />
  }
  const color = personColor(name)
  return (
    <span
      title={name}
      className={`inline-grid flex-none place-items-center rounded-full font-semibold tracking-wide ${SIZES[size]} ${className}`}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
      }}
    >
      {initials(name)}
    </span>
  )
}
