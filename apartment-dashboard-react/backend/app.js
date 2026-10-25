import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import apartmentRoutes from './routes/apartment.js'
import adminRoutes from './routes/admin.js'
import { authenticateToken, requireAdmin } from './middleware/auth.js'
import { appleReturn } from './utils/appleOAuth.js'

const app = express()

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for testing)
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(limiter)
// Apple posts the browser here from appleid.apple.com, which CORS below would turn away
app.post('/api/auth/apple/return', express.urlencoded({ extended: false }), appleReturn)
// Allow multiple dev origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5181',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5181'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // allow tools like curl / mobile apps
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tasks', authenticateToken, taskRoutes)
app.use('/api/apartment', authenticateToken, apartmentRoutes)
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Error handling middleware (Express needs all four args to treat it as one)
app.use((err, req, res, _next) => {
  console.error('Error:', err)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

export default app
