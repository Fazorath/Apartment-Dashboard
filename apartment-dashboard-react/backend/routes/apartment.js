import express from 'express'
import { getUserModel } from '../models/User.js'
import { authenticateToken } from '../middleware/auth.js'
import dbManager from '../utils/dbManager.js'

const router = express.Router()

// Get apartment information
router.get('/info', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      apartment: {
        code: req.user.apartmentCode,
        name: req.user.apartmentName,
        username: req.user.username,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    })
  } catch (error) {
    console.error('Get apartment info error:', error)
    res.status(500).json({ error: 'Failed to get apartment information' })
  }
})

// Get apartment statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { Task } = req.apartmentModels
    const tasks = await Task.find({ active: true })
    
    let overdue = 0
    let soon = 0
    const today = new Date()
    
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
      success: true,
      stats: {
        totalTasks: tasks.length,
        overdueTasks: overdue,
        soonTasks: soon,
        okTasks: tasks.length - overdue - soon
      }
    })
  } catch (error) {
    console.error('Get apartment stats error:', error)
    res.status(500).json({ error: 'Failed to get apartment statistics' })
  }
})

// Get apartment connection status
router.get('/connection-status', authenticateToken, async (req, res) => {
  try {
    const status = dbManager.getConnectionStatus()
    res.json({
      success: true,
      connectionStatus: status
    })
  } catch (error) {
    console.error('Get connection status error:', error)
    res.status(500).json({ error: 'Failed to get connection status' })
  }
})

// Update apartment name
router.put('/name', authenticateToken, async (req, res) => {
  try {
    const { apartmentName } = req.body
    
    if (!apartmentName || apartmentName.trim().length < 2) {
      return res.status(400).json({ error: 'Apartment name must be at least 2 characters' })
    }
    
    const User = await getUserModel()
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { apartmentName: apartmentName.trim() },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({
      success: true,
      message: 'Apartment name updated successfully',
      apartmentName: user.apartmentName
    })
  } catch (error) {
    console.error('Update apartment name error:', error)
    res.status(500).json({ error: 'Failed to update apartment name' })
  }
})

// Get apartment members (for future expansion)
router.get('/members', authenticateToken, async (req, res) => {
  try {
    // For now, return the single apartment owner
    // In the future, this could be expanded to support multiple members per apartment
    res.json({
      success: true,
      members: [{
        username: req.user.username,
        role: 'owner',
        joinedAt: req.user.createdAt
      }]
    })
  } catch (error) {
    console.error('Get apartment members error:', error)
    res.status(500).json({ error: 'Failed to get apartment members' })
  }
})

export default router
