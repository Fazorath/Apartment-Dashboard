import { afterAll } from 'vitest'
import dbManager from '../utils/dbManager.js'

afterAll(async () => {
  await dbManager.closeAllConnections()
})
