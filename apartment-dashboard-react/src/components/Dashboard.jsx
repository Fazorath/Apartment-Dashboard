import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTasks, createTask, updateTask, markTaskDone } from '../services/api'
import TaskModal from './TaskModal'
import SettingsModal from './SettingsModal'
import TaskCard from './TaskCard'
import TaskDetailsMenu from './TaskDetailsMenu'

export default function Dashboard() {
  const { logout, user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    overdue: 0,
    soon: 0,
    total: 0,
    completed: 0,
    weeklyChanges: {
      overdue: 0,
      soon: 0,
      active: 0,
      completed: 0
    }
  })
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

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

  // Task details menu handlers
  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task)
    setShowTaskDetails(true)
  }

  const handleCloseTaskDetails = () => {
    setShowTaskDetails(false)
    setSelectedTask(null)
  }

  const handleTaskUpdated = (updatedTask) => {
    setTasks(prev => prev.map(task => 
      task._id === updatedTask._id ? updatedTask : task
    ))
    setSelectedTask(updatedTask)
  }

  const handleTaskDeleted = (taskId) => {
    setTasks(prev => prev.filter(task => task._id !== taskId))
    calculateStats(tasks.filter(task => task._id !== taskId))
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
        // Mark as done - backend will store the previous lastDone automatically
        updatedTask = await markTaskDone(taskId)
      } else {
        // Unmark - restore the previous lastDone date
        const currentTask = tasks.find(task => task._id === taskId)
        if (!currentTask) return
        
        // Restore to the previous lastDone date
        const previousLastDone = currentTask.previousLastDone
        
        updatedTask = await updateTask({ 
          id: taskId, 
          lastDone: previousLastDone,
          lastCompleted: null,
          lastCompletedBy: null,
          previousLastDone: null
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
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    let overdue = 0
    let soon = 0
    let completed = 0
    let active = 0
    
    // Weekly change tracking
    let overdueLastWeek = 0
    let soonLastWeek = 0
    let completedThisWeek = 0
    let activeLastWeek = 0
    
    tasksData.forEach(task => {
      // Count completed tasks based on current completion state (lastCompleted)
      if (task.lastCompleted) {
        const daysSinceCompleted = Math.floor((today - new Date(task.lastCompleted)) / (1000 * 60 * 60 * 24))
        if (daysSinceCompleted <= 30) {
          completed++
        }
        // Count tasks completed this week
        if (daysSinceCompleted <= 7) {
          completedThisWeek++
        }
      }
      
      // Calculate due status based on historical completion (lastDone)
      if (!task.lastDone) {
        overdue++
        active++
        overdueLastWeek++
        activeLastWeek++
        return
      }
      
      const daysSince = Math.floor((today - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
      const daysUntilDue = task.frequencyDays - daysSince
      
      // Calculate what the status was one week ago
      const daysSinceLastWeek = Math.floor((oneWeekAgo - new Date(task.lastDone)) / (1000 * 60 * 60 * 24))
      const daysUntilDueLastWeek = task.frequencyDays - daysSinceLastWeek
      
      // Current status
      if (daysUntilDue <= 0) {
        overdue++
        active++
      } else if (daysUntilDue <= 2) {
        soon++
        active++
      } else {
        active++
      }
      
      // Last week status
      if (daysUntilDueLastWeek <= 0) {
        overdueLastWeek++
        activeLastWeek++
      } else if (daysUntilDueLastWeek <= 2) {
        soonLastWeek++
        activeLastWeek++
      } else {
        activeLastWeek++
      }
    })
    
    // Calculate weekly changes
    const overdueChange = overdue - overdueLastWeek
    const soonChange = soon - soonLastWeek
    const activeChange = active - activeLastWeek
    const completedChange = completedThisWeek
    
    setStats({
      overdue,
      soon,
      total: active,
      completed,
      weeklyChanges: {
        overdue: overdueChange,
        soon: soonChange,
        active: activeChange,
        completed: completedChange
      }
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
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
            <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-400" fill="currentColor"><path d="M12 2a1 1 0 0 1 .894.553l2.382 4.764 5.258.764a1 1 0 0 1 .554 1.705l-3.8 3.705.897 5.225a1 1 0 0 1-1.451 1.054L12 17.77l-4.684 2.2a1 1 0 0 1-1.451-1.055l.897-5.224-3.8-3.705a1 1 0 0 1 .554-1.705l5.258-.764L11.106 2.553A1 1 0 0 1 12 2z"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg lg:text-2xl font-semibold tracking-tight truncate">
                {user?.apartmentName ? `${user.apartmentName} Dashboard` : 'Dashboard'}
              </h1>
              <p className="text-xs lg:text-sm text-zinc-400 hidden sm:block">
                Recurring chores with last‑done dates & due status
              </p>
            </div>
        </div>

          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Mobile: Only show Add Task button */}
          <button
              onClick={() => handleOpenModal()}
              className="lg:hidden inline-flex items-center gap-1 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2 py-1.5 text-xs hover:bg-indigo-500/25"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
              <span className="hidden xs:inline">Add</span>
            </button>
            
            {/* Desktop: Show Settings and Logout buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={() => setShowSettings(true)} className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm border border-white/10 hover:bg-white/[0.08] transition">Settings</button>
              <button onClick={() => { logout(); window.location.href = '/login' }} className="rounded-xl bg-rose-500/15 text-rose-300 px-3 py-2 text-sm border border-rose-500/30 hover:bg-rose-500/20 transition">Logout</button>
            </div>
            
            {/* Mobile: Settings and Logout buttons */}
            <div className="lg:hidden flex items-center gap-1">
              <button onClick={() => setShowSettings(true)} className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-xs border border-white/10 hover:bg-white/[0.08] transition">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5M19.43 12.97c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/></svg>
          </button>
              <button onClick={() => { logout(); window.location.href = '/login' }} className="rounded-lg bg-rose-500/15 text-rose-300 px-2 py-1.5 text-xs border border-rose-500/30 hover:bg-rose-500/20 transition">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8 space-y-6 lg:space-y-8">
        {/* Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[
            {label: 'Overdue', value: stats.overdue, change: stats.weeklyChanges.overdue},
            {label: 'Due Soon', value: stats.soon, change: stats.weeklyChanges.soon},
            {label: 'Active', value: stats.total, change: stats.weeklyChanges.active},
            {label: 'Completed', value: stats.completed, change: stats.weeklyChanges.completed},
          ].map((s, i) => (
            <div key={s.label} className="group rounded-xl lg:rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-3 lg:p-4 hover:from-white/[0.08] transition">
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <p className="text-xs lg:text-sm text-zinc-400 truncate">{s.label}</p>
                <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 lg:h-4 lg:w-4 text-zinc-300" fill="currentColor"><path d="M5 3a2 2 0 0 0-2 2v1h18V5a2 2 0 0 0-2-2H5zm16 5H3v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/></svg>
                </div>
          </div>
              <div className="flex items-end justify-between">
                <span className="text-xl lg:text-3xl font-semibold tracking-tight">{s.value}</span>
                {s.change !== 0 && (
                  <span className={`text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md lg:rounded-lg border ${
                    s.change > 0 
                      ? 'text-emerald-300/80 bg-emerald-500/10 border-emerald-500/30' 
                      : 'text-rose-300/80 bg-rose-500/10 border-rose-500/30'
                  }`}>
                    {s.change > 0 ? '+' : ''}{s.change}
                  </span>
                )}
          </div>
          </div>
          ))}
        </section>

        {/* Toolbar */}
        <section className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0">
            {['All','Overdue','Soon','Completed'].map((filter, i)=> (
              <button
                key={filter} 
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-2 rounded-xl text-sm border transition whitespace-nowrap flex-shrink-0 ${
                  activeFilter === filter 
                    ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' 
                    : 'bg-white/[0.06] border-white/10 text-zinc-300 hover:bg-white/[0.08]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-80">
            <input
                className="w-full sm:w-80 rounded-xl bg-white/[0.06] border border-white/10 pl-9 pr-3 py-2 outline-none text-sm placeholder:text-zinc-500 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10.5 15A4.5 4.5 0 1 1 10.5 6a4.5 4.5 0 0 1 0 9z"/></svg>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-2 text-sm hover:bg-indigo-500/25"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
              Add Task
            </button>
          </div>
        </section>

        {/* Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left: Tasks */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Tasks */}
            <div className="rounded-xl lg:rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-semibold">
                  {activeFilter === 'All' ? 'All Tasks' : activeFilter}
                </h2>
                <span className="text-xs text-zinc-400">
                  {getFilteredTasks().length} tasks
                </span>
              </div>
              <ul className="divide-y divide-white/10">
                {getFilteredTasks().length === 0 ? (
                  <li className="px-4 lg:px-5 py-6 lg:py-8 text-center text-zinc-400">
                    {searchQuery ? 'No tasks match your search' : `No ${activeFilter.toLowerCase()} tasks`}
                  </li>
                ) : (
                  getFilteredTasks().map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onComplete={handleTaskCompletion}
                      onEdit={handleOpenTaskDetails}
                      showDetails={true}
                      variant="default"
                    />
                  ))
                )}
              </ul>
            </div>

            {/* Upcoming */}
            <div className="rounded-xl lg:rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="px-4 lg:px-5 py-3 lg:py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-semibold">Upcoming (Next 7 days)</h2>
                <button className="text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]">View calendar</button>
              </div>
              <div className="p-4 lg:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {getUpcomingTasks().length === 0 ? (
                  <div className="col-span-full text-center text-zinc-400 py-6 lg:py-8">
                    No upcoming tasks this week! 🎉
            </div>
          ) : (
                  getUpcomingTasks().map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                      onComplete={handleTaskCompletion}
                      onEdit={handleOpenTaskDetails}
                      showDetails={false}
                      variant="upcoming"
              />
            ))
          )}
              </div>
            </div>
          </div>

          {/* Right: Insights */}
          <aside className="space-y-4 lg:space-y-6">
            {/* Progress */}
            <div className="rounded-xl lg:rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm lg:text-base font-semibold">This Week</h3>
                <span className="text-xs text-zinc-400">Goal: {Math.max(20, stats.total)} tasks</span>
              </div>
              <div className="mt-3 lg:mt-4 grid grid-cols-3 gap-3 lg:gap-4">
                {[
                  {k:'Done',v:stats.completed},
                  {k:'Active',v:stats.total},
                  {k:'Overdue',v:stats.overdue}
                ].map((m,i)=>(
                  <div key={m.k} className="rounded-lg lg:rounded-xl border border-white/10 bg-[#111217] p-3 lg:p-4">
                    <p className="text-xs text-zinc-400">{m.k}</p>
                    <p className="mt-1 text-lg lg:text-2xl font-semibold">{m.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 lg:mt-4">
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

            {/* Lists */}
            <div className="rounded-xl lg:rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm lg:text-base font-semibold">Lists</h3>
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
                      <li key={name} className="flex items-center justify-between rounded-lg lg:rounded-xl bg-[#111217] px-3 py-2 border border-white/10">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <span className="h-2 w-2 lg:h-2.5 lg:w-2.5 rounded-full bg-emerald-400/70"/>
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

      {/* Task Modal */}
      {showModal && (
        <TaskModal
          key={editingTask ? `edit-${editingTask._id}` : 'create'}
          task={editingTask}
          onClose={handleCloseModal}
          onSave={handleSaveTask}
        />
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Task Details Menu */}
      <TaskDetailsMenu
        key={selectedTask ? `details-${selectedTask._id}` : 'details'}
        task={selectedTask}
        isOpen={showTaskDetails}
        onClose={handleCloseTaskDetails}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </div>
  )
}

 
