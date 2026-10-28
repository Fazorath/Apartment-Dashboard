import express from 'express'
import rateLimit from 'express-rate-limit'
import { authenticateToken, setApartmentContext } from '../middleware/auth.js'
import { getUserModel } from '../models/User.js'
import { getPairedDisplayModel } from '../models/Display.js'
import { startPairing, pollPairing, claimPairing, hashCredential, BAD_CODE_ERROR } from '../utils/displayPairing.js'

const router = express.Router()

// These routes are reachable without signing in, so per-IP limits plus the short code
// life and single use are what stop code guessing and pending-pairing floods
const pairingLimiter = (limit, windowMs, message) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: message }
})

export const startPairingLimiter = pairingLimiter(10, 15 * 60 * 1000, 'Too many pairing attempts. Try again in a few minutes.')
export const claimPairingLimiter = pairingLimiter(10, 15 * 60 * 1000, 'Too many wrong or repeated codes. Try again in a few minutes.')
// The TV polls every ~3s (20 a minute) while it shows a code; this leaves 3x headroom
export const pollPairingLimiter = pairingLimiter(60, 60 * 1000, 'Checking too often. Slow down.')

/**
 * Accepts only a Paired Display's credential (never a session token) and sets the
 * Apartment context the way session auth does.
 */
const authenticateDisplay = async (req, res, next) => {
  try {
    const credential = (req.headers.authorization || '').split(' ')[1]
    if (!credential) return res.status(401).json({ error: 'Display credential required' })

    const PairedDisplay = await getPairedDisplayModel()
    const display = await PairedDisplay.findOne({ credentialHash: hashCredential(credential) })
    if (!display) return res.status(401).json({ error: 'Invalid credential' })

    req.display = display
    await setApartmentContext(req, display.apartmentCode)
    next()
  } catch (error) {
    console.error('Display auth error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

// The TV asks for a Pairing code
router.post('/pairing', startPairingLimiter, async (req, res) => {
  try {
    const { code, pairingSecret, expiresAt } = await startPairing()
    res.status(201).json({ code, pairingSecret, expiresAt })
  } catch (error) {
    console.error('Start pairing error:', error)
    res.status(500).json({ error: 'Failed to start pairing' })
  }
})

// The TV waits to be paired
router.post('/pairing/poll', pollPairingLimiter, async (req, res) => {
  try {
    res.json(await pollPairing(req.body?.pairingSecret))
  } catch (error) {
    console.error('Poll pairing error:', error)
    res.status(500).json({ error: 'Failed to check pairing' })
  }
})

// A Roommate enters the code shown on the TV
router.post('/pair', claimPairingLimiter, authenticateToken, async (req, res) => {
  try {
    const paired = await claimPairing(req.apartmentCode, req.user.username, req.body?.code)
    if (!paired) return res.status(400).json({ error: BAD_CODE_ERROR })
    res.json({ success: true })
  } catch (error) {
    console.error('Pair display error:', error)
    res.status(500).json({ error: 'Failed to pair the Display' })
  }
})

// An allowlist, so new Chore fields stay off the Display unless someone adds them here
const displayChore = (task) => ({
  id: task._id,
  name: task.name,
  assignedTo: task.assignedTo,
  frequencyDays: task.frequencyDays,
  lastDone: task.lastDone,
  lastCompleted: task.lastCompleted,
  lastCompletedBy: task.lastCompletedBy,
  pinned: task.pinned,
  priority: task.priority
})

router.get('/chores', authenticateDisplay, async (req, res) => {
  try {
    const { Task } = req.apartmentModels
    const User = await getUserModel()
    const [tasks, roommate] = await Promise.all([
      Task.find({ active: { $ne: false } }).sort({ pinned: -1, lastDone: 1, name: 1 }),
      User.findOne({ apartmentCode: req.apartmentCode })
    ])
    res.json({
      apartmentName: roommate?.apartmentName,
      serverTime: new Date().toISOString(),
      chores: tasks.map(displayChore)
    })
  } catch (error) {
    console.error('Display chores error:', error)
    res.status(500).json({ error: 'Failed to fetch chores' })
  }
})

export default router
