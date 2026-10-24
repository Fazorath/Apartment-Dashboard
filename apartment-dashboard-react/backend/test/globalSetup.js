import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod

export async function setup() {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri().replace(/\/$/, '')
}

export async function teardown() {
  await mongod.stop()
}
