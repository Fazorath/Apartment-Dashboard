import { ArrowDown, Flag } from 'lucide-react'

const MARKERS = {
  high: { Icon: Flag, label: 'High', className: 'h-5 gap-1 rounded-pill bg-danger-soft px-1.5 font-medium text-danger' },
  low: { Icon: ArrowDown, label: 'Low', className: 'gap-0.5 font-normal text-subtle' },
}

// High is the loudest marker and Low the quietest. Normal is only shown with showNormal, but is always announced.
export default function PriorityBadge({ priority, showNormal = false, className = '' }) {
  const marker = MARKERS[priority]
  if (!marker) return showNormal ? <span className={className}>Normal</span> : <span className="sr-only">Normal priority</span>
  const { Icon, label } = marker
  return (
    <span className={`inline-flex flex-none items-center text-xs ${marker.className} ${className}`}>
      <Icon size={12} aria-hidden="true" />
      {label}<span className="sr-only"> priority</span>
    </span>
  )
}
