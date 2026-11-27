import mongoose from 'mongoose'
import { NODE_ENV } from './config.js'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'mongo', 'mongodb'])

function hostsOf (uri) {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, '')
  const afterCreds = withoutScheme.replace(/^[^@]*@/, '')
  const beforePath = afterCreds.split(/[/?]/, 1)[0]
  return beforePath.split(',').map((entry) => {
    const hostport = entry.trim()
    if (hostport.startsWith('[')) {
      const end = hostport.indexOf(']')
      return end === -1 ? hostport.toLowerCase() : hostport.slice(1, end).toLowerCase()
    }
    return hostport.split(':', 1)[0].toLowerCase()
  }).filter(Boolean)
}

export function isLocalMongoUri (uri) {
  if (!uri || typeof uri !== 'string') return false
  if (/^mongodb\+srv:/i.test(uri)) return false
  try {
    const hosts = hostsOf(uri)
    if (hosts.length === 0) return false
    return hosts.every((host) => {
      if (LOCAL_HOSTS.has(host)) return true
      if (host.endsWith('.mongodb.net')) return false
      return false
    })
  } catch {
    return false
  }
}

export function looksLikeProductionMongoUri (uri) {
  if (!uri || typeof uri !== 'string') return false
  const lower = uri.toLowerCase()
  if (/mongodb\.net/i.test(lower)) return true
  if (/apiaberta/i.test(lower) && !/localhost/.test(lower)) return true
  if (/^mongodb\+srv:/i.test(uri) && !isLocalMongoUri(uri)) return true
  return !isLocalMongoUri(uri)
}

/**
 * Dev and tests must never reach a remote/production MongoDB.
 * Production (NODE_ENV=production) may use any URI.
 */
export function assertSafeMongoUri (uri, env = NODE_ENV) {
  if (!uri) {
    throw new Error('MONGO_URI is required')
  }
  if (env === 'test') {
    throw new Error('Tests must not connect to MongoDB. Inject an in-memory store via buildApp({ db }).')
  }
  if (env !== 'production' && looksLikeProductionMongoUri(uri)) {
    throw new Error(`Refusing to connect to non-local MongoDB in ${env}: use mongodb://localhost:27017/${'apiaberta-dre'}`)
  }
}

export async function connectMongo (uri, env = NODE_ENV) {
  assertSafeMongoUri(uri, env)
  await mongoose.connect(uri)
  return mongoose.connection
}

export async function disconnectMongo () {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}
