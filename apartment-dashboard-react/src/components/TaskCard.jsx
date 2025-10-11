import { useState } from 'react'

const TaskCard = ({ 
  task, 
  onComplete, 
  onEdit, 
  showDetails = true,
  variant = 'default' // 'default', 'compact', 'upcoming'
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Calculate task status
  const getTaskStatus = (task) => {
    if (!task.lastDone) return 'overdue'
    
    const today = new Date()
    const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
    const daysUntilDue = task.frequencyDays - daysSince
    
    if (daysUntilDue <= 0) return 'overdue'
    if (daysUntilDue <= 2) return 'soon'
    return 'ok'
  }

  // Get status configuration
  const getStatusConfig = (status) => {
    const configs = {
      overdue: {
        label: 'Overdue',
        className: 'bg-rose-400/10 border border-rose-400/30 text-rose-200',
        priority: 'High'
      },
      soon: {
        label: 'Due Soon',
        className: 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-200',
        priority: 'Med'
      },
      ok: {
        label: 'OK',
        className: 'bg-blue-400/10 border border-blue-400/30 text-blue-200',
        priority: 'Low'
      }
    }
    return configs[status] || configs.ok
  }

  // Calculate days since last done
  const daysSince = task.lastDone ? Math.floor((new Date() - new Date(task.lastDone)) / (1000 * 60 * 60 * 24)) : null
  
  // Get task status
  const status = getTaskStatus(task)
  const statusConfig = getStatusConfig(status)

  // Custom checkbox component
  const TaskCheckbox = ({ task, onComplete }) => {
    // Check if task is currently marked as complete (has lastCompleted date)
    const isCurrentlyCompleted = task.lastCompleted && 
      Math.floor((new Date() - new Date(task.lastCompleted)) / (1000 * 60 * 60 * 24)) <= 1

    return (
      <button
        onClick={(e) => {
          e.stopPropagation() // Prevent card click
          onComplete(task._id, !isCurrentlyCompleted)
        }}
        className={`mt-1.5 h-5 w-5 rounded-md border-2 transition-all duration-200 hover:scale-110 ${
          isCurrentlyCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-white/30 bg-white/5 hover:border-emerald-400/50 hover:bg-emerald-500/10'
        }`}
      >
        {isCurrentlyCompleted && (
          <svg 
            viewBox="0 0 24 24" 
            className="h-3 w-3 mx-auto" 
            fill="currentColor"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        )}
      </button>
    )
  }

  // Render different variants
  if (variant === 'compact') {
    return (
      <div 
        className="rounded-xl border border-white/10 bg-[#111217] p-4 hover:bg-white/[0.04] transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {task.assignedTo && `${task.assignedTo} · `}
            {statusConfig.priority}
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10">
            {task.assignedTo || 'General'}
          </span>
        </div>
        <p className="mt-2 font-medium text-zinc-100">{task.name}</p>
        {task.notes && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{task.notes}</p>
        )}
      </div>
    )
  }

  if (variant === 'upcoming') {
    return (
      <div 
        className="rounded-lg lg:rounded-xl border border-white/10 bg-[#111217] p-3 lg:p-4 hover:bg-white/[0.04] transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs lg:text-sm text-zinc-400">
            {task.assignedTo && `${task.assignedTo} · `}
            {statusConfig.priority}
          </div>
          <span className="text-[10px] lg:text-[11px] px-1.5 lg:px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10">
            {task.assignedTo || 'General'}
          </span>
        </div>
        <p className="text-sm lg:text-base font-medium text-zinc-100">{task.name}</p>
        {task.notes && (
          <p className="mt-1 text-xs lg:text-sm text-zinc-500 line-clamp-2">{task.notes}</p>
        )}
      </div>
    )
  }

  // Default variant (main task list)
  return (
    <li 
      className="px-4 lg:px-5 py-3 lg:py-4 flex items-start gap-3 lg:gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEdit(task)}
    >
      <TaskCheckbox task={task} onComplete={onComplete} />
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          <p className="text-sm lg:text-base font-medium text-zinc-100 truncate">{task.name}</p>
          
          {task.assignedTo && (
            <span className="text-[10px] lg:text-[11px] px-1.5 lg:px-2 py-0.5 rounded-md bg-indigo-400/15 border border-indigo-400/30 text-indigo-200 flex-shrink-0">
              {task.assignedTo}
            </span>
          )}
          
          <span className={`text-[10px] lg:text-[11px] px-1.5 lg:px-2 py-0.5 rounded-md ${statusConfig.className} flex-shrink-0`}>
            {statusConfig.label}
          </span>
          
          {task.pinned && (
            <span className="text-[10px] lg:text-[11px] px-1.5 lg:px-2 py-0.5 rounded-md bg-yellow-400/10 border border-yellow-400/30 text-yellow-200 flex-shrink-0">
              📌 Pinned
            </span>
          )}
        </div>
        
        <p className="mt-1 text-xs lg:text-sm text-zinc-400">
          {daysSince !== null 
            ? `Last done ${daysSince}d ago · repeats every ${task.frequencyDays} days`
            : `Never done · repeats every ${task.frequencyDays} days`
          }
        </p>
        
        {task.notes && (
          <p className="mt-1 text-xs lg:text-sm text-zinc-500 line-clamp-2">{task.notes}</p>
        )}
      </div>
      
    </li>
  )
}

export default TaskCard
