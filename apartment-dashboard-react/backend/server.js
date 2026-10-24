import 'dotenv/config'
import app from './app.js'
import dbManager from './utils/dbManager.js'

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
