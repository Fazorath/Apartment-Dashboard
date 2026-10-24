import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod

export async function setup() {
  mongod = await MongoMemoryServer.create()
  // dbManager appends `/<dbName>` to the base URI, so it must not end in a slash
  process.env.MONGODB_URI = mongod.getUri().replace(/\/$/, '')
  // The auth tests rely on these codes being open for first registration,
  // whatever the developer's shell or .env says
  process.env.ALLOWED_APARTMENT_CODES = 'GP412,AL420'
  process.env.JWT_SECRET = 'test-secret'
}

export async function teardown() {
  await mongod.stop()
}
