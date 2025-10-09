import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { 
  Plus, 
  Settings, 
  LogOut, 
  Search, 
  Filter,
  CheckCircle,
  Trash2,
  Edit,
  Calendar,
  User,
  Clock
} from 'lucide-react'
import TaskModal from './TaskModal'
import { getTasks, createTask, updateTask, deleteTask, markTaskDone } from '../services/api'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)
  
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    retry: false,
    enabled: !!user
  })

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      setShowTaskModal(false)
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      setShowTaskModal(false)
      setEditingTask(null)
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
    }
  })

  const markDoneMutation = useMutation({
    mutationFn: markTaskDone,
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
    }
  })

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || 
      (filter === 'overdue' && getTaskStatus(task) === 'overdue') ||
      (filter === 'soon' && getTaskStatus(task) === 'soon') ||
      (filter === 'ok' && getTaskStatus(task) === 'ok')
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: tasks.length,
    overdue: tasks.filter(task => getTaskStatus(task) === 'overdue').length,
    soon: tasks.filter(task => getTaskStatus(task) === 'soon').length
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowTaskModal(true)
  }

  const handleCreateTask = () => {
    setEditingTask(null)
    setShowTaskModal(true)
  }

  const handleMarkDone = (taskId) => {
    markDoneMutation.mutate(taskId)
  }

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#0b0b0f', color: '#f5f5f5'}}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#0b0b0f', color: '#f5f5f5'}}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Error loading tasks</h2>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn"
            style={{padding: '.5rem .75rem', borderRadius: '.75rem', border: '1px solid rgba(79,70,229,0.4)', fontWeight: '600', background: 'rgba(79,70,229,0.25)', color: '#f5f5f5'}}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background: '#0b0b0f', color: '#f5f5f5'}}>
      {/* Header */}
      <header className="header" style={{display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', padding: '2rem 1rem 0'}}>
        <div>
          <h1 className="title" style={{fontSize: 'clamp(1.5rem, 2vw + 1rem, 2.25rem)', fontWeight: '800'}}>412 Dashboard</h1>
          <p className="subtitle" style={{color: '#9ca3af', marginTop: '.25rem'}}>Recurring chores with last-done dates & due status.</p>
        </div>
        <div className="actions" style={{display: 'flex', gap: '.5rem', alignItems: 'center'}}>
          <span style={{color: '#9ca3af', marginRight: '1rem'}}>Welcome, {user?.username}</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn"
            style={{padding: '.5rem .75rem', borderRadius: '.75rem', border: '1px solid rgba(255,255,255,0.12)', fontWeight: '600', background: 'rgba(255,255,255,0.06)', color: '#f5f5f5'}}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => {
              logout()
              window.location.reload()
            }}
            className="btn"
            style={{padding: '.5rem .75rem', borderRadius: '.75rem', border: '1px solid rgba(239,68,68,0.4)', fontWeight: '600', background: 'rgba(239,68,68,0.15)', color: '#f87171'}}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="container" style={{maxWidth: '72rem', margin: '0 auto', padding: '0 1rem'}}>
        {/* Stats */}
        <section className="stats" style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '.75rem', margin: '1rem 0'}}>
          <div className="card" style={{border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', padding: '1rem'}}>
            <div style={{color: '#9ca3af'}}>Overdue</div>
            <div className="stat-num" style={{fontWeight: '700', fontSize: '1.375rem'}}>{stats.overdue}</div>
          </div>
          <div className="card" style={{border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', padding: '1rem'}}>
            <div style={{color: '#9ca3af'}}>Due in 2 days</div>
            <div className="stat-num" style={{fontWeight: '700', fontSize: '1.375rem'}}>{stats.soon}</div>
          </div>
          <div className="card" style={{border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', padding: '1rem'}}>
            <div style={{color: '#9ca3af'}}>Total Active</div>
            <div className="stat-num" style={{fontWeight: '700', fontSize: '1.375rem'}}>{stats.total}</div>
          </div>
        </section>

        {/* Filters */}
        <section className="toolbar card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', padding: '.5rem .75rem', marginBottom: '.75rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)'}}>
          <div className="toolbar-left" style={{display: 'flex', gap: '.5rem', alignItems: 'center'}}>
            {['all', 'overdue', 'soon', 'ok', 'completed'].map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className="filterBtn btn"
                style={{
                  padding: '.5rem .75rem',
                  borderRadius: '.75rem',
                  border: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: '600',
                  background: filter === filterType ? 'rgba(79,70,229,0.25)' : 'rgba(255,255,255,0.06)',
                  color: '#f5f5f5'
                }}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
          <div className="toolbar-right" style={{display: 'flex', gap: '.5rem', alignItems: 'center'}}>
            <input
              type="search"
              placeholder="Search tasks…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{background: 'rgba(255,255,255,0.06)', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '.75rem', padding: '.5rem .75rem', outline: 'none'}}
            />
            <button
              onClick={handleCreateTask}
              className="btn"
              style={{padding: '.5rem .75rem', borderRadius: '.75rem', border: '1px solid rgba(79,70,229,0.4)', fontWeight: '600', background: 'rgba(79,70,229,0.25)', color: '#f5f5f5'}}
            >
              ➕ Add Task
            </button>
          </div>
        </section>

        {/* Task list */}
        <section id="taskList" className="list" style={{display: 'grid', gap: '.75rem'}}>
          {filteredTasks.length === 0 ? (
            <div className="empty-state" style={{textAlign: 'center', padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'}}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="20" width="60" height="40" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
                <rect x="22" y="32" width="36" height="8" rx="2" fill="#9ca3af"/>
                <rect x="22" y="44" width="24" height="6" rx="2" fill="#9ca3af"/>
                <circle cx="40" cy="60" r="4" fill="#4f46e5"/>
              </svg>
              <div style={{color: '#9ca3af', fontSize: '1.1rem'}}>No tasks yet! Click <b>Add Task</b> to get started.</div>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={() => handleEditTask(task)}
                onMarkDone={() => handleMarkDone(task._id)}
                onDelete={() => handleDeleteTask(task._id)}
              />
            ))
          )}
        </section>

        <footer className="footer muted" style={{marginTop: '1rem', color: '#9ca3af', textAlign: 'center', padding: '1rem 0'}}>
          Local-first. Data lives in your browser. Tip: ⌘/Ctrl + D marks the first task done.
        </footer>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false)
            setEditingTask(null)
          }}
          onSave={(taskData) => {
            if (editingTask) {
              updateTaskMutation.mutate({ id: editingTask._id, ...taskData })
            } else {
              createTaskMutation.mutate(taskData)
            }
          }}
        />
      )}
    </div>
  )
}

const TaskCard = ({ task, onEdit, onMarkDone, onDelete }) => {
  const status = getTaskStatus(task)
  const statusConfig = getStatusConfig(status)
  const today = new Date().toISOString().split('T')[0]
  const isCompletedToday = task.lastCompleted === today

  return (
    <div className="card item" style={{
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '1rem',
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(8px)',
      padding: '1rem',
      borderLeft: status === 'overdue' ? '4px solid #ef4444' : status === 'soon' ? '4px solid #f59e0b' : '4px solid #10b981'
    }}>
      <div className="item-top" style={{display: 'flex', justifyContent: 'space-between', gap: '.75rem', alignItems: 'flex-start'}}>
        <div className="item-main" style={{flex: 1}}>
          <div className="item-line" style={{display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem'}}>
            <h3 className="name" style={{fontWeight: '700', fontSize: '1.05rem', color: '#f5f5f5'}}>{task.name}</h3>
            <span className="tag statusTag" style={{
              fontSize: '.75rem',
              padding: '.2rem .5rem',
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.12)',
              fontWeight: '600',
              ...(status === 'overdue' ? {borderColor: '#ef4444aa', color: '#fff', background: '#ef4444cc'} :
                  status === 'soon' ? {borderColor: '#f59e0baa', color: '#fff', background: '#f59e0bcc'} :
                  {borderColor: '#10b981aa', color: '#fff', background: '#10b981cc'})
            }}>
              {statusConfig.label}
            </span>
            {task.pinned && (
              <span className="tag pinnedTag" style={{fontSize: '.75rem', padding: '.2rem .5rem', borderRadius: '9999px', border: '1px solid rgba(79,70,229,0.3)', color: '#4f46e5', background: 'rgba(79,70,229,0.2)'}}>
                Pinned
              </span>
            )}
            {isCompletedToday && (
              <span className="tag completedTag" style={{fontSize: '.75rem', padding: '.2rem .5rem', borderRadius: '9999px', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', background: 'rgba(16,185,129,0.2)'}}>
                Completed today
              </span>
            )}
          </div>
          
          <div className="muted details" style={{color: '#9ca3af', fontSize: '.9rem', marginBottom: '.5rem'}}>
            Repeat: {task.frequencyDays} days • Last done: {task.lastDone ? new Date(task.lastDone).toLocaleDateString() : '— (never)'}
          </div>

          {task.assignedTo && (
            <div className="xsmall assignment" style={{fontSize: '.8rem', color: '#9ca3af', marginBottom: '.25rem'}}>
              Assigned to: {task.assignedTo}
            </div>
          )}

          {task.lastCompletedBy && (
            <div className="xsmall history" style={{fontSize: '.8rem', color: '#9ca3af', marginBottom: '.25rem'}}>
              Last completed by: {task.lastCompletedBy}
            </div>
          )}

          {task.notes && (
            <div className="xsmall notes" style={{fontSize: '.8rem', color: '#9ca3af'}}>
              {task.notes}
            </div>
          )}
        </div>

        <div className="item-actions" style={{display: 'flex', gap: '.5rem'}}>
          <button
            onClick={onMarkDone}
            className="btn markBtn"
            title="Mark Done"
            style={{
              padding: '.5rem',
              borderRadius: '.75rem',
              border: '1px solid rgba(255,255,255,0.12)',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.06)',
              color: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="#4f46e5" strokeWidth="2"/>
              <path d="M6 10.5l2.5 2.5L14 7.5" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={onEdit}
            className="btn editBtn"
            title="Edit"
            style={{
              padding: '.5rem',
              borderRadius: '.75rem',
              border: '1px solid rgba(255,255,255,0.12)',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.06)',
              color: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 13.5V16h2.5l7.1-7.1a1 1 0 0 0 0-1.4l-2.1-2.1a1 1 0 0 0-1.4 0L4 13.5z" stroke="#4f46e5" strokeWidth="2"/>
              <path d="M12.5 6.5l1.5 1.5" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="btn danger deleteBtn"
            title="Delete"
            style={{
              padding: '.5rem',
              borderRadius: '.75rem',
              border: '1px solid #ef4444aa',
              fontWeight: '600',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="6" width="10" height="9" rx="2" stroke="#ef4444" strokeWidth="2"/>
              <path d="M8 9v4M12 9v4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 6h14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 3h4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function getTaskStatus(task) {
  if (!task.lastDone) return 'overdue'
  
  const lastDone = new Date(task.lastDone)
  const now = new Date()
  const daysSince = Math.floor((now - lastDone) / (1000 * 60 * 60 * 24))
  const daysUntilDue = task.frequencyDays - daysSince
  
  if (daysUntilDue <= 0) return 'overdue'
  if (daysUntilDue <= 2) return 'soon'
  return 'ok'
}

function getStatusConfig(status) {
  switch (status) {
    case 'overdue':
      return {
        label: 'Overdue',
        badgeClass: 'status-overdue'
      }
    case 'soon':
      return {
        label: 'Due Soon',
        badgeClass: 'status-soon'
      }
    case 'ok':
      return {
        label: 'On Track',
        badgeClass: 'status-ok'
      }
    default:
      return {
        label: 'Unknown',
        badgeClass: 'status-ok'
      }
  }
}

export default Dashboard
