import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { PORT, SERVICE_NAME, VERSION } from './config.js'
import { dreRoutes, metaRoutes } from './routes.js'
import { createMemoryStore } from './store.js'

export async function buildApp (opts = {}) {
  const logger = opts.logger === undefined
    ? {
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined
    }
    : opts.logger

  const app = Fastify({ logger })
  app.decorate('db', opts.db || createMemoryStore())

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'API Aberta - DRE Legislation Connector',
        description: 'Portuguese legislation from the Diário da República. Data is ingested from the official INCM RSS feeds (Série I and II) and cached in MongoDB.',
        version: VERSION
      },
      servers: [{ url: `http://localhost:${PORT}` }],
      tags: [
        { name: 'DRE', description: 'Diário da República legislation' }
      ]
    }
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' }
  })

  app.get('/swagger', async () => app.swagger())

  app.get('/health', async () => ({
    status: 'ok',
    service: SERVICE_NAME,
    version: VERSION,
    timestamp: new Date().toISOString()
  }))

  await app.register(metaRoutes)
  await app.register(dreRoutes, { prefix: '/dre' })

  return app
}
