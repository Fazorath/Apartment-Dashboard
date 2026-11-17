import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import apartmentRoutes from './routes/apartment.js'
import adminRoutes from './routes/admin.js'
import displayRoutes from './routes/display.js'
import { authenticateToken, requireAdmin } from './middleware/auth.js'
import { appleReturn } from './utils/appleOAuth.js'

// TRUST_PROXY is a hop count ("1" for one reverse proxy) or any other value Express accepts
const parseTrustProxy = (value) => (/^\d+$/.test(value) ? Number(value) : value)

/**
 * Builds the Express app. `env` is read once here, so tests can build apps with
 * different settings; the default export uses process.env.
 */
export const buildApp = (env = process.env) => {
  const app = express()

  // Behind a reverse proxy every request would otherwise come from the proxy's address,
  // and every rate limiter would treat all Roommates as one client
  if (env.TRUST_PROXY) app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY))

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
    env.FRONTEND_URL,
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
  // Mounted without session auth: the Display has its own credential, and the
  // Roommate-facing routes inside add session auth themselves
  app.use('/api/display', displayRoutes)
  app.use('/api/tasks', authenticateToken, taskRoutes)
  app.use('/api/apartment', authenticateToken, apartmentRoutes)
  app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes)

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV || 'development'
    })
  })

  // The built frontend, served from the same origin as the API (production image only)
  const staticDir = env.STATIC_DIR && path.resolve(env.STATIC_DIR)
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir))
    // Deep links and reloads (/display, /verify-email?...) belong to the client router
    app.get(/^\/(?!api(\/|$))/, (req, res) => res.sendFile(path.join(staticDir, 'index.html')))
  }

  // Error handling middleware (Express needs all four args to treat it as one)
  app.use((err, req, res, _next) => {
    console.error('Error:', err)
    res.status(500).json({ 
      error: 'Internal server error',
      message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    })
  })

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' })
  })

  return app
}

export default buildApp()
