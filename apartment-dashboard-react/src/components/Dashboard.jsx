import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTasks, createTask, updateTask, markTaskDone } from '../services/api'
import TaskModal from './TaskModal'

export default function Dashboard() {
  const { logout, user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    overdue: 0,
    soon: 0,
    total: 0,
    completed: 0
  })
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch tasks and stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const tasksData = await getTasks()
        setTasks(tasksData)
        calculateStats(tasksData)
      } catch (err) {
        setError(err.message)
        console.error('Failed to fetch tasks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Modal handlers
  const handleOpenModal = (task = null) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTask(null)
  }

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        // Update existing task
        const updatedTask = await updateTask({ id: editingTask._id, ...taskData })
        setTasks(prev => prev.map(task => 
          task._id === editingTask._id ? updatedTask : task
        ))
      } else {
        // Create new task
        const newTask = await createTask(taskData)
        setTasks(prev => [...prev, newTask])
      }
      
      // Recalculate stats
      const updatedTasks = editingTask 
        ? tasks.map(task => task._id === editingTask._id ? { ...task, ...taskData } : task)
        : [...tasks, { ...taskData, _id: Date.now() }] // temporary ID for stats calculation
      
      calculateStats(updatedTasks)
      handleCloseModal()
    } catch (error) {
      console.error('Failed to save task:', error)
      // You could add a toast notification here
    }
  }

  const handleTaskCompletion = async (taskId, markAsComplete = true) => {
    try {
      let updatedTask
      
      if (markAsComplete) {
        // Mark as done
        updatedTask = await markTaskDone(taskId)
      } else {
        // Unmark - only update the completion-related fields
        updatedTask = await updateTask({ 
          id: taskId, 
          lastDone: null,
          lastCompleted: null,
          lastCompletedBy: null
        })
      }
      
      setTasks(prev => prev.map(task => 
        task._id === taskId ? updatedTask : task
      ))
      
      // Recalculate stats with updated task
      const updatedTasks = tasks.map(task => 
        task._id === taskId ? updatedTask : task
      )
      calculateStats(updatedTasks)
    } catch (error) {
      console.error('Failed to update task completion:', error)
      // You could add a toast notification here
    }
  }

  const calculateStats = (tasksData) => {
    const today = new Date()
    let overdue = 0
    let soon = 0
    let completed = 0
    let active = 0
    
    tasksData.forEach(task => {
      if (!task.lastDone) {
        overdue++
        active++
        return
      }
      
      const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
      const daysUntilDue = task.frequencyDays - daysSince
      
      if (daysUntilDue <= 0) {
        overdue++
        active++
      } else if (daysUntilDue <= 2) {
        soon++
        active++
      } else {
        active++
      }
      
      // Count completed tasks (done within last 30 days)
      const daysSinceCompleted = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
      if (daysSinceCompleted <= 30) {
        completed++
      }
    })
    
    setStats({
      overdue,
      soon,
      total: active,
      completed
    })
  }

  // Filtering and search functions
  const getFilteredTasks = () => {
    let filteredTasks = tasks

    // Apply status filter
    if (activeFilter !== 'All') {
      filteredTasks = tasks.filter(task => {
        const status = getTaskStatus(task)
        switch (activeFilter) {
          case 'Overdue':
            return status === 'overdue'
          case 'Soon':
            return status === 'soon'
          case 'Completed':
            return task.lastDone && Math.floor((new Date() - new Date(task.lastDone)) / (1000 * 60 * 60 * 24)) <= 1
          default:
            return true
        }
      })
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredTasks = filteredTasks.filter(task => 
        task.name.toLowerCase().includes(query) ||
        (task.assignedTo && task.assignedTo.toLowerCase().includes(query)) ||
        (task.notes && task.notes.toLowerCase().includes(query))
      )
    }

    return filteredTasks
  }

  // Helper functions to categorize tasks
  const getTaskStatus = (task) => {
    if (!task.lastDone) return 'overdue'
    
    const today = new Date()
    const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
    const daysUntilDue = task.frequencyDays - daysSince
    
    if (daysUntilDue <= 0) return 'overdue'
    if (daysUntilDue <= 2) return 'soon'
    return 'ok'
  }

  const getTodayTasks = () => {
    return tasks.filter(task => {
      const status = getTaskStatus(task)
      return status === 'overdue' || status === 'soon'
    })
  }

  const getUpcomingTasks = () => {
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return tasks.filter(task => {
      if (!task.lastDone) return false
      
      const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
      const daysUntilDue = task.frequencyDays - daysSince
      
      return daysUntilDue > 0 && daysUntilDue <= 7
    })
  }

  // Custom checkbox component
  const TaskCheckbox = ({ task, onComplete }) => {
    const isRecentlyCompleted = task.lastDone && 
      Math.floor((new Date() - new Date(task.lastDone)) / (1000 * 60 * 60 * 24)) <= 1

    return (
      <button
        onClick={() => onComplete(task._id, !isRecentlyCompleted)}
        className={`mt-1.5 h-5 w-5 rounded-md border-2 transition-all duration-200 hover:scale-110 ${
          isRecentlyCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-white/30 bg-white/5 hover:border-emerald-400/50 hover:bg-emerald-500/10'
        }`}
      >
        {isRecentlyCompleted && (
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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-rose-400 mb-4">⚠️ Error loading dashboard</div>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-200">
      {/* App Shell */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/70 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-400" fill="currentColor"><path d="M12 2a1 1 0 0 1 .894.553l2.382 4.764 5.258.764a1 1 0 0 1 .554 1.705l-3.8 3.705.897 5.225a1 1 0 0 1-1.451 1.054L12 17.77l-4.684 2.2a1 1 0 0 1-1.451-1.055l.897-5.224-3.8-3.705a1 1 0 0 1 .554-1.705l5.258-.764L11.106 2.553A1 1 0 0 1 12 2z"/></svg>
            </div>
        <div>
              <h1 className="text-2xl font-semibold tracking-tight">412 Dashboard</h1>
              <p className="text-sm text-zinc-400">
                Recurring chores with last‑done dates & due status
              </p>
            </div>
        </div>

          <div className="flex items-center gap-3">
          <button
              onClick={() => handleOpenModal()}
              className="hidden md:flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-sm border border-white/10 hover:bg-white/[0.08] transition"
          >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M11 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H2a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z"/></svg>
              New List
          </button>
            <button className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm border border-white/10 hover:bg-white/[0.08] transition">Settings</button>
            <button onClick={() => { logout(); window.location.href = '/login' }} className="rounded-xl bg-rose-500/15 text-rose-300 px-3 py-2 text-sm border border-rose-500/30 hover:bg-rose-500/20 transition">Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Stats Row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {label: 'Overdue', value: stats.overdue},
            {label: 'Due in 2 days', value: stats.soon},
            {label: 'Total Active', value: stats.total},
            {label: 'Completed (30d)', value: stats.completed},
          ].map((s, i) => (
            <div key={i} className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 hover:from-white/[0.08] transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{s.label}</p>
                <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-300" fill="currentColor"><path d="M5 3a2 2 0 0 0-2 2v1h18V5a2 2 0 0 0-2-2H5zm16 5H3v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/></svg>
                </div>
          </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold tracking-tight">{s.value}</span>
                {/* TODO: Add dynamic weekly change indicators */}
              </div>
          </div>
          ))}
        </section>

        {/* Toolbar */}
        <section className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex overflow-x-auto gap-2">
            {['All','Overdue','Soon','Completed'].map((filter, i)=> (
              <button
                key={i} 
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-2 rounded-xl text-sm border transition whitespace-nowrap ${
                  activeFilter === filter 
                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' 
                    : 'bg-white/[0.06] border-white/10 text-zinc-300 hover:bg-white/[0.08]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="md:ml-auto flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
            <input
                className="w-full md:w-80 rounded-xl bg-white/[0.06] border border-white/10 pl-9 pr-3 py-2 outline-none text-sm placeholder:text-zinc-500 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10.5 15A4.5 4.5 0 1 1 10.5 6a4.5 4.5 0 0 1 0 9z"/></svg>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-2 text-sm hover:bg-indigo-500/25"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
              Add Task
            </button>
          </div>
        </section>

        {/* Content Grid */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Today & Upcoming */}
          <div className="xl:col-span-2 space-y-6">
            {/* Tasks */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {activeFilter === 'All' ? 'All Tasks' : activeFilter}
                </h2>
                <span className="text-xs text-zinc-400">
                  {getFilteredTasks().length} tasks
                </span>
              </div>
              <ul className="divide-y divide-white/10">
                {getFilteredTasks().length === 0 ? (
                  <li className="px-5 py-8 text-center text-zinc-400">
                    {searchQuery ? 'No tasks match your search' : `No ${activeFilter.toLowerCase()} tasks`}
                  </li>
                ) : (
                  getFilteredTasks().map((task, i) => {
                    const status = getTaskStatus(task)
                    const daysSince = task.lastDone ? Math.floor((new Date() - new Date(task.lastDone)) / (1000 * 60 * 60 * 24)) : null
                    
                    return (
                      <li key={task._id} className="px-5 py-4 flex items-start gap-4 hover:bg-white/[0.04]">
                        <TaskCheckbox task={task} onComplete={handleTaskCompletion} />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-zinc-100">{task.name}</p>
                            {task.assignedTo && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-400/15 border border-indigo-400/30 text-indigo-200">
                                {task.assignedTo}
                              </span>
                            )}
                            <span className={`text-[11px] px-2 py-0.5 rounded-md ${
                              status === 'overdue' 
                                ? 'bg-rose-400/10 border border-rose-400/30 text-rose-200'
                                : status === 'soon'
                                ? 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-200'
                                : 'bg-blue-400/10 border border-blue-400/30 text-blue-200'
                            }`}>
                              {status === 'overdue' ? 'Overdue' : status === 'soon' ? 'Due Soon' : 'OK'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-400">
                            {daysSince !== null 
                              ? `Last done ${daysSince}d ago · repeats every ${task.frequencyDays} days`
                              : `Never done · repeats every ${task.frequencyDays} days`
                            }
                          </p>
                        </div>
                        <button 
                          onClick={() => handleOpenModal(task)}
                          className="self-center text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]"
                        >
                          Details
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>

            {/* Upcoming */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Upcoming (Next 7 days)</h2>
                <button className="text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]">View calendar</button>
              </div>
              <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {getUpcomingTasks().length === 0 ? (
                  <div className="col-span-full text-center text-zinc-400 py-8">
                    No upcoming tasks this week! 🎉
            </div>
          ) : (
                  getUpcomingTasks().map((task, i) => {
                    const today = new Date()
                    const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
                    const daysUntilDue = task.frequencyDays - daysSince
                    const dueDate = new Date(today.getTime() + daysUntilDue * 24 * 60 * 60 * 1000)
                    
                    return (
                      <div key={task._id} className="rounded-xl border border-white/10 bg-[#111217] p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-zinc-400">
                            {dueDate.toLocaleDateString('en-US', { weekday: 'short' })} · {daysUntilDue}d
                          </div>
                          {task.assignedTo && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10">
                              {task.assignedTo}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 font-medium">{task.name}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Insights */}
          <aside className="space-y-6">
            {/* Progress */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">This Week</h3>
                <span className="text-xs text-zinc-400">Goal: {Math.max(20, stats.total)} tasks</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {[
                  {k:'Done',v:stats.completed},
                  {k:'Active',v:stats.total},
                  {k:'Overdue',v:stats.overdue}
                ].map((m,i)=>(
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111217] p-4">
                    <p className="text-xs text-zinc-400">{m.k}</p>
                    <p className="mt-1 text-2xl font-semibold">{m.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-zinc-400">Completion</span>
                  <span className="text-zinc-300">
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500/60 transition-all duration-300" 
                    style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Streaks */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold">Streaks</h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[{k:'Daily',v:'5 days'},{k:'Weekly',v:'8 weeks'}].map((s,i)=>(
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111217] p-4">
                    <p className="text-xs text-zinc-400">{s.k}</p>
                    <p className="mt-1 text-lg font-semibold">{s.v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-400">Tip: ⌘/Ctrl + D marks the first task done.</p>
            </div>

            {/* Lists */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lists</h3>
                <button className="text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]">Manage</button>
              </div>
              <ul className="mt-3 space-y-2">
                {(() => {
                  // Group tasks by assignedTo or create "Unassigned" category
                  const taskGroups = tasks.reduce((acc, task) => {
                    const category = task.assignedTo || 'Unassigned'
                    if (!acc[category]) {
                      acc[category] = 0
                    }
                    acc[category]++
                    return acc
                  }, {})
                  
                  return Object.entries(taskGroups).length === 0 ? (
                    <li className="px-3 py-2 text-center text-zinc-400 text-sm">
                      No tasks yet
                    </li>
                  ) : (
                    Object.entries(taskGroups).map(([name, count], i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-[#111217] px-3 py-2 border border-white/10">
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70"/>
                          <p className="text-sm">{name}</p>
                        </div>
                        <span className="text-xs text-zinc-400">{count} active</span>
                      </li>
                    ))
                  )
                })()}
              </ul>
            </div>
          </aside>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 py-10 text-center text-xs text-zinc-500">
        Local‑first. Data lives in your browser.
        </footer>

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}

 
