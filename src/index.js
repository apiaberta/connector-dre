import cron from 'node-cron'
import { MONGO_URI, NODE_ENV, PORT, SERVICE_NAME, SYNC_CRON } from './config.js'
import { buildApp } from './app.js'
import { connectMongo } from './mongo.js'
import { createMongoStore } from './store.js'
import { syncAll } from './sync.js'

await connectMongo(MONGO_URI, NODE_ENV)
const db = createMongoStore()
const app = await buildApp({ db })

async function runSync (reason) {
  app.log.info({ reason }, 'DRE sync starting')
  try {
    const summary = await syncAll({ db, log: app.log })
    app.log.info({ summary }, 'DRE sync complete')
    return summary
  } catch (err) {
    app.log.error({ err }, 'DRE sync failed')
    try {
      await db.markSync({ at: new Date(), error: err.message })
    } catch (markErr) {
      app.log.error({ err: markErr }, 'Failed to persist sync error')
    }
    return null
  }
}

cron.schedule(SYNC_CRON, () => {
  runSync('cron')
})

runSync('startup').catch((err) => {
  app.log.error({ err }, 'Initial DRE sync failed; serving cached data if any')
})

await app.listen({ port: PORT, host: '0.0.0.0' })
app.log.info(`${SERVICE_NAME} listening on port ${PORT}`)
