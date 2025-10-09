import express from 'express'

const router = express.Router()

// Get all tasks for apartment
router.get('/', async (req, res) => {
  try {
    const { Task } = req.apartmentModels
    const tasks = await Task.find({})
      .sort({ pinned: -1, lastDone: 1, name: 1 })
    
    res.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Create new task
router.post('/', async (req, res) => {
  try {
    const {
      name,
      assignedTo,
      frequencyDays,
      lastDone,
      notes,
      pinned,
      active
    } = req.body

    // Validation
    if (!name || !frequencyDays) {
      return res.status(400).json({ error: 'Name and frequency are required' })
    }

    const { Task } = req.apartmentModels
    const task = new Task({
      name,
      assignedTo,
      frequencyDays: parseInt(frequencyDays),
      lastDone: lastDone ? new Date(lastDone) : null,
      notes,
      pinned: Boolean(pinned),
      active: active !== false
    })

    await task.save()
    res.status(201).json(task)
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Update task
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      assignedTo,
      frequencyDays,
      lastDone,
      notes,
      pinned,
      active,
      lastCompleted,
      lastCompletedBy,
      previousLastDone
    } = req.body

    // Build update object with only provided fields
    const updateData = {
      updatedAt: new Date()
    }

    if (name !== undefined) updateData.name = name
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo
    if (frequencyDays !== undefined) updateData.frequencyDays = parseInt(frequencyDays)
    if (lastDone !== undefined) updateData.lastDone = lastDone ? new Date(lastDone) : null
    if (notes !== undefined) updateData.notes = notes
    if (pinned !== undefined) updateData.pinned = Boolean(pinned)
    if (active !== undefined) updateData.active = active !== false
    if (lastCompleted !== undefined) updateData.lastCompleted = lastCompleted ? new Date(lastCompleted) : null
    if (lastCompletedBy !== undefined) updateData.lastCompletedBy = lastCompletedBy
    if (previousLastDone !== undefined) updateData.previousLastDone = previousLastDone ? new Date(previousLastDone) : null

    const { Task } = req.apartmentModels
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { new: true }
    )

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { Task } = req.apartmentModels
    const task = await Task.findOneAndDelete({
      _id: req.params.id
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({ success: true, message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// Mark task as done
router.post('/:id/done', async (req, res) => {
  try {
    const { completedBy } = req.body
    const today = new Date()
    
    const { Task } = req.apartmentModels
    
    // First get the current task to store the previous lastDone
    const currentTask = await Task.findOne({ _id: req.params.id })
    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id },
      {
        previousLastDone: currentTask.lastDone, // Store the previous lastDone
        lastDone: today,
        lastCompleted: today,
        lastCompletedBy: completedBy || req.user.username,
        updatedAt: today
      },
      { new: true }
    )

    res.json(task)
  } catch (error) {
    console.error('Mark done error:', error)
    res.status(500).json({ error: 'Failed to mark task as done' })
  }
})

// Get task statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date()
    const { Task } = req.apartmentModels
    const tasks = await Task.find({ active: true })
    
    let overdue = 0
    let soon = 0
    
    tasks.forEach(task => {
      if (!task.lastDone) {
        overdue++
        return
      }
      
      const daysSince = Math.floor((today - task.lastDone) / (1000 * 60 * 60 * 24))
      const daysUntilDue = task.frequencyDays - daysSince
      
      if (daysUntilDue <= 0) {
        overdue++
      } else if (daysUntilDue <= 2) {
        soon++
      }
    })
    
    res.json({
      total: tasks.length,
      overdue,
      soon,
      ok: tasks.length - overdue - soon
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to get statistics' })
  }
})

export default router
