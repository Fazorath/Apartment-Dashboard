import mongoose from 'mongoose'
import dbManager from '../utils/dbManager.js'

// At most one per Apartment (unique apartmentCode). Only the credential's hash is kept.
const pairedDisplaySchema = new mongoose.Schema({
  apartmentCode: { type: String, required: true, unique: true },
  credentialHash: { type: String, required: true, index: true },
  pairedAt: { type: Date, required: true },
  pairedBy: { type: String, required: true },
  lastSeen: { type: Date }
})

// A Pairing code waiting to be claimed, then waiting for the TV to collect its credential.
// The TTL index removes it once `expiresAt` passes.
const pendingPairingSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true },
  secretHash: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  claimed: { type: Boolean, default: false },
  // Set when claimed, until the TV collects it
  apartmentCode: { type: String },
  credential: { type: String }
})

export const getPairedDisplayModel = async () => {
  const connection = await dbManager.getMainConnection()
  return connection.model('PairedDisplay', pairedDisplaySchema)
}

export const getPendingPairingModel = async () => {
  const connection = await dbManager.getMainConnection()
  return connection.model('PendingPairing', pendingPairingSchema)
}
