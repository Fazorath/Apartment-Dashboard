import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, X, StickyNote, Save } from 'lucide-react'
import { updateTask, deleteTask } from '../services/api'

const TaskDetailsMenu = ({ 
  task, 
  isOpen, 
  onClose, 
  onTaskUpdated, 
  onTaskDeleted 
}) => {
  const [draftNotes, setDraftNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Initialize draft notes when task changes
  useEffect(() => {
    if (task) {
      setDraftNotes(task.notes || '')
    }
  }, [task])

  if (!task) return null

  // Calculate task status
  const getTaskStatus = (task) => {
    if (!task.lastDone) return 'Overdue'
    
    const today = new Date()
    const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
    const daysUntilDue = task.frequencyDays - daysSince
    
    if (daysUntilDue <= 0) return 'Overdue'
    if (daysUntilDue <= 2) return 'Due Soon'
    return 'OK'
  }

  // Get priority based on status
  const getPriority = (task) => {
    const status = getTaskStatus(task)
    if (status === 'Overdue') return 'High'
    if (status === 'Due Soon') return 'Medium'
    return 'Low'
  }

  // Get tags from the tags field
  const getTags = (task) => {
    const tags = [...(task.tags || [])]
    if (task.pinned) tags.push('pinned')
    return tags
  }

  const handleSaveNotes = async () => {
    if (!task) return
    
    setIsSaving(true)
    try {
      const updatedTask = await updateTask({ 
        id: task._id, 
        notes: draftNotes 
      })
      onTaskUpdated(updatedTask)
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    
    const confirmed = window.confirm(`Delete task: "${task.name}"? This cannot be undone.`)
    if (!confirmed) return
    
    setIsDeleting(true)
    try {
      await deleteTask(task._id)
      onTaskDeleted(task._id)
      onClose()
    } catch (error) {
      console.error('Failed to delete task:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const status = getTaskStatus(task)
  const priority = getPriority(task)
  const tags = getTags(task)
  

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dim overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed right-0 top-0 z-50 h-full w-full sm:w-[480px] md:w-[520px] bg-[#0d0f13] border-l border-white/10 shadow-2xl"
            role="dialog"
            aria-labelledby="task-title"
          >
            {/* Panel header */}
            <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 bg-[#0d0f13]/95 backdrop-blur">
              <div className="min-w-0">
                <h2 id="task-title" className="truncate text-base font-semibold">{task.name}</h2>
                <p className="mt-0.5 text-xs text-white/50">
                  ID {task._id} • created {new Date(task.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="h-[calc(100%-4rem)] overflow-y-auto px-5 pb-6">
              {/* Meta */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Status</p>
                  <p className="mt-1 font-medium">{status}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Priority</p>
                  <p className="mt-1 font-medium">{priority}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <span key={tag} className="text-[11px] rounded-full px-2 py-0.5 border border-white/10 text-white/70">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-white/50">No tags</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Description</p>
                <p className="mt-1 text-sm leading-relaxed text-white/80">
                  {task.notes || 'No description provided'}
                </p>
              </div>

              {/* Notes */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-white/45 inline-flex items-center gap-1">
                    <StickyNote size={14}/> Notes
                  </p>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-xs hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14}/> {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Add quick notes for this task…"
                  className="mt-2 w-full min-h-[112px] resize-y rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Assigned To */}
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Assigned To</p>
                <div className="mt-2 text-sm text-white/70">
                  {task.assignedTo ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-400/15 border border-indigo-400/30 text-indigo-200">
                      {task.assignedTo}
                    </span>
                  ) : (
                    <span className="text-white/50">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Task Details */}
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Task Details</p>
                <div className="mt-2 space-y-2 text-sm text-white/70">
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <span>Every {task.frequencyDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last done:</span>
                    <span>
                      {task.lastDone 
                        ? `${Math.floor((new Date() - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))}d ago`
                        : 'Never'
                      }
                    </span>
                  </div>
                  {task.lastCompletedBy && (
                    <div className="flex justify-between">
                      <span>Last completed by:</span>
                      <span>{task.lastCompletedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger zone */}
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Danger zone</p>
                <button
                  onClick={handleDeleteTask}
                  disabled={isDeleting}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16}/> {isDeleting ? 'Deleting...' : 'Delete task'}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default TaskDetailsMenu
