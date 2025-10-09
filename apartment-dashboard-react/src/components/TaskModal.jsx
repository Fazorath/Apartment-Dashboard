import { useState, useEffect } from 'react'
import { X, Calendar, User, FileText, Pin, CheckCircle } from 'lucide-react'

const TaskModal = ({ task, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    assignedTo: '',
    frequencyDays: 7,
    lastDone: '',
    notes: '',
    pinned: false,
    active: true
  })

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        assignedTo: task.assignedTo || '',
        frequencyDays: task.frequencyDays || 7,
        lastDone: task.lastDone || '',
        notes: task.notes || '',
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
        pinned: false,
        active: true
      })
    }
  }, [task])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="dialog card" style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '1rem',
        width: 'min(44rem, 96vw)',
        padding: 0
      }}>
        <div className="dialog-head" style={{padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.12)'}}>
          <h2 className="dialog-title" style={{fontWeight: '700', color: '#f5f5f5'}}>
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body" style={{display: 'grid', gap: '.75rem', padding: '1rem'}}>
          <div className="field" style={{display: 'grid', gap: '.25rem'}}>
            <label className="label" style={{fontSize: '.9rem', color: '#9ca3af'}}>
              Task Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="Enter task name"
              required
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '.75rem',
                padding: '.5rem .75rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <div className="field" style={{display: 'grid', gap: '.25rem'}}>
            <label className="label" style={{fontSize: '.9rem', color: '#9ca3af'}}>
              Assigned To
            </label>
            <input
              type="text"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              className="input"
              placeholder="Roommate name (optional)"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '.75rem',
                padding: '.5rem .75rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <div className="field" style={{display: 'grid', gap: '.25rem'}}>
            <label className="label" style={{fontSize: '.9rem', color: '#9ca3af'}}>
              Frequency (days) *
            </label>
            <input
              type="number"
              name="frequencyDays"
              value={formData.frequencyDays}
              onChange={handleChange}
              className="input"
              min="1"
              required
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '.75rem',
                padding: '.5rem .75rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <div className="field" style={{display: 'grid', gap: '.25rem'}}>
            <label className="label" style={{fontSize: '.9rem', color: '#9ca3af'}}>
              Last Done
            </label>
            <input
              type="date"
              name="lastDone"
              value={formData.lastDone}
              onChange={handleChange}
              className="input"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '.75rem',
                padding: '.5rem .75rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <div className="field" style={{display: 'grid', gap: '.25rem'}}>
            <label className="label" style={{fontSize: '.9rem', color: '#9ca3af'}}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input"
              rows="3"
              placeholder="Additional notes (optional)"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '.75rem',
                padding: '.5rem .75rem',
                outline: 'none',
                width: '100%',
                resize: 'vertical'
              }}
            />
          </div>

          <div className="toggles" style={{display: 'flex', gap: '1.5rem'}}>
            <label className="check" style={{display: 'flex', gap: '.5rem', alignItems: 'center', color: '#9ca3af'}}>
              <input
                type="checkbox"
                name="pinned"
                checked={formData.pinned}
                onChange={handleChange}
                style={{
                  width: '1rem',
                  height: '1rem',
                  accentColor: '#4f46e5'
                }}
              />
              Pin to top
            </label>

            <label className="check" style={{display: 'flex', gap: '.5rem', alignItems: 'center', color: '#9ca3af'}}>
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleChange}
                style={{
                  width: '1rem',
                  height: '1rem',
                  accentColor: '#4f46e5'
                }}
              />
              Active
            </label>
          </div>

          <div className="dialog-foot" style={{padding: '.75rem', display: 'flex', gap: '.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.12)'}}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{
                padding: '.5rem .75rem',
                borderRadius: '.75rem',
                border: '1px solid rgba(255,255,255,0.12)',
                fontWeight: '600',
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              style={{
                padding: '.5rem .75rem',
                borderRadius: '.75rem',
                border: '1px solid rgba(79,70,229,0.4)',
                fontWeight: '600',
                background: 'rgba(79,70,229,0.25)',
                color: '#f5f5f5'
              }}
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
