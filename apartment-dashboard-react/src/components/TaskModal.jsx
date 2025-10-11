import React, { useState, useEffect, useLayoutEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, User2, CalendarDays, CheckCircle2 } from 'lucide-react'

const TaskModal = ({ task, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    assignedTo: '',
    frequencyDays: 7,
    lastDone: '',
    notes: '',
    tags: '',
    pinned: false,
    active: true
  })

  // Lock body scroll when modal is open
  useLayoutEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { 
      document.body.style.overflow = prev 
    }
  }, [])

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        assignedTo: task.assignedTo || '',
        frequencyDays: task.frequencyDays || 7,
        lastDone: task.lastDone || '',
        notes: task.notes || '',
        tags: Array.isArray(task.tags) ? task.tags.join(', ') : (task.tags || ''),
        pinned: task.pinned || false,
        active: task.active !== false
      })
    } else {
      setFormData({
        name: '',
        assignedTo: '',
        frequencyDays: 7,
        lastDone: new Date().toISOString().split('T')[0],
        notes: '',
        tags: '',
        pinned: false,
        active: true
      })
    }
  }, [task])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Convert tags string back to array for the API
    const tagsArray = formData.tags 
      ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : []
    
    const dataToSave = {
      ...formData,
      tags: tagsArray
    }
    
    onSave(dataToSave)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <AnimatePresence>
      <motion.div
        key="modal-overlay"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/80 supports-[backdrop-filter]:backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        key="modal-content"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.05 }}
        className="fixed inset-0 z-50 grid place-items-center px-4"
      >
        <div className="transform-gpu will-change-[opacity,transform,filter] w-full max-w-[720px] rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-900/60 supports-[backdrop-filter]:bg-white/5 backdrop-blur-xl shadow-[0_20px_120px_-20px_rgba(0,0,0,0.6)]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-semibold">{task ? 'Edit Task' : 'Add New Task'}</h3>
              <p className="text-xs text-white/50">All fields mirror your current modal; just refined visuals.</p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              aria-label="Close"
            >
              <X size={16}/>
            </button>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Name */}
              <div className="md:col-span-2">
                <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Task Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter task name"
                  required
                  className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Assigned To</label>
                <div className="relative">
                  <User2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    placeholder="Roommate name (optional)"
                    className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 pl-10 pr-4 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="cleaning, kitchen, weekly (comma‑separated)"
                  className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Frequency (days) *</label>
                <input
                  type="number"
                  name="frequencyDays"
                  min={1}
                  value={formData.frequencyDays}
                  onChange={handleChange}
                  required
                  className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Last Done */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Last Done</label>
                <div className="relative">
                  <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="date"
                    name="lastDone"
                    value={formData.lastDone}
                    onChange={handleChange}
                    className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/10 pl-10 pr-4 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-[11px] uppercase tracking-wide text-white/50 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes (optional)"
                  className="w-full min-h-[120px] rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Toggles */}
              <div className="md:col-span-2 flex items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    name="pinned"
                    checked={formData.pinned} 
                    onChange={handleChange} 
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                  />
                  <span>Pin to top</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    name="active"
                    checked={formData.active} 
                    onChange={handleChange} 
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                  />
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={14}/> Active</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-2xl border border-white/10 px-4 text-sm hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-2xl border border-emerald-400/30 bg-emerald-400/15 px-4 text-sm hover:bg-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                {task ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TaskModal
