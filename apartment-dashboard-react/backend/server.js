import 'dotenv/config'
import { checkProductionConfig } from './config.js'

const missing = checkProductionConfig(process.env)
if (missing.length) {
  console.error(`❌ Refusing to start in production: ${missing.join(', ')} not set`)
  process.exit(1)
}

// Imported after the check so a bad config fails before anything connects
const { default: app } = await import('./app.js')
const { default: dbManager } = await import('./utils/dbManager.js')

const PORT = process.env.PORT || 3000

// Initialize database manager
dbManager.getMainConnection()
.then(() => console.log('✅ Database manager initialized'))
.catch(err => console.error('❌ Database manager initialization error:', err))

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})
