import { ArrowDown, Flag } from 'lucide-react'

// High is the loudest marker and Low the quietest. Normal shows nothing but is still announced.
export default function PriorityBadge({ priority, className = '' }) {
  if (priority === 'high') {
    return (
      <span className={`inline-flex h-5 flex-none items-center gap-1 rounded-pill bg-danger-soft px-1.5 text-xs font-medium text-danger ${className}`}>
        <Flag size={12} aria-hidden="true" />
        High<span className="sr-only"> priority</span>
      </span>
    )
  }
  if (priority === 'low') {
    return (
      <span className={`inline-flex flex-none items-center gap-0.5 text-xs font-normal text-subtle ${className}`}>
        <ArrowDown size={12} aria-hidden="true" />
        Low<span className="sr-only"> priority</span>
      </span>
    )
  }
  return <span className="sr-only">Normal priority</span>
}
