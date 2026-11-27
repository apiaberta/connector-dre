import { SOURCE_DRE, SOURCE_HOME, VERSION } from './config.js'
import { latestPagination, parsePageLimit } from './pagination.js'

const diplomaItem = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'string' },
    series: { type: 'string', enum: ['I', 'II'] },
    number: { type: 'string' },
    date: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
    emitter: { type: 'string' },
    summary: { type: 'string' },
    url: { type: 'string' }
  }
}

const listEnvelope = {
  type: 'object',
  properties: {
    data: { type: 'array', items: diplomaItem },
    total: { type: 'integer' },
    page: { type: 'integer' },
    limit: { type: 'integer' }
  }
}

const listQuery = {
  type: 'object',
  properties: {
    series: { type: 'string', description: 'I, II, 1 or 2' },
    type: { type: 'string', description: 'Diploma type, e.g. Decreto-Lei, Portaria' },
    q: { type: 'string', description: 'Search title, summary, emitter, type or number' },
    date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
  }
}

function listQueryFrom (req) {
  return {
    series: req.query.series,
    type: req.query.type,
    q: req.query.q,
    date: req.query.date
  }
}

export async function dreRoutes (app) {
  app.get('/latest', {
    schema: {
      description: 'Most recently published DRE diplomas (from the cached official RSS). Compatible with the gateway dre.diploma.new webhook.',
      tags: ['DRE'],
      querystring: {
        type: 'object',
        properties: {
          series: { type: 'string', description: 'I, II, 1 or 2' },
          type: { type: 'string' },
          q: { type: 'string' },
          date: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      },
      response: { 200: listEnvelope }
    }
  }, async (req) => {
    const { page, limit } = latestPagination(req.query)
    return req.server.db.listDiplomas(listQueryFrom(req), { page, limit })
  })

  app.get('/legislation', {
    schema: {
      description: 'List cached DRE diplomas with pagination and filters.',
      tags: ['DRE'],
      querystring: listQuery,
      response: { 200: listEnvelope }
    }
  }, async (req) => {
    const { page, limit } = parsePageLimit(req.query)
    return req.server.db.listDiplomas(listQueryFrom(req), { page, limit })
  })

  app.get('/legislation/:id', {
    schema: {
      description: 'Get a single cached diploma by stable id.',
      tags: ['DRE'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }, async (req, reply) => {
    const doc = await req.server.db.getDiploma(req.params.id)
    if (!doc) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Diploma '${req.params.id}' not found`,
        statusCode: 404
      })
    }
    return { data: doc }
  })

  app.get('/search', {
    schema: {
      description: 'Search cached DRE diplomas by term.',
      tags: ['DRE'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search term (required)' },
          series: { type: 'string' },
          type: { type: 'string' },
          date: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        },
        required: ['q']
      },
      response: { 200: listEnvelope }
    }
  }, async (req, reply) => {
    const q = String(req.query.q || '').trim()
    if (!q) {
      return reply.code(400).send({ error: 'q parameter is required' })
    }
    const { page, limit } = parsePageLimit(req.query)
    return req.server.db.listDiplomas({ ...listQueryFrom(req), q }, { page, limit })
  })

  app.get('/series', {
    schema: {
      description: 'List DRE series covered by this connector.',
      tags: ['DRE']
    }
  }, async () => ({
    series: [
      { id: 'I', aliases: ['1'], name: 'I Série', description: 'Legislative acts, laws, decrees', feed: 'https://files.diariodarepublica.pt/rss/serie1.xml' },
      { id: 'II', aliases: ['2'], name: 'II Série', description: 'Administrative acts', feed: 'https://files.diariodarepublica.pt/rss/serie2.xml' }
    ]
  }))

  app.get('/types', {
    schema: {
      description: 'Common DRE legislation types.',
      tags: ['DRE']
    }
  }, async () => ({
    types: [
      { code: 'lei', name: 'Lei' },
      { code: 'dl', name: 'Decreto-Lei' },
      { code: 'dr', name: 'Decreto Regulamentar' },
      { code: 'portaria', name: 'Portaria' },
      { code: 'resolucao', name: 'Resolução' },
      { code: 'despacho', name: 'Despacho' },
      { code: 'acordao', name: 'Acórdão' },
      { code: 'aviso', name: 'Aviso' },
      { code: 'edital', name: 'Edital' },
      { code: 'decl', name: 'Declaração' }
    ],
    source: SOURCE_HOME
  }))
}

export async function metaRoutes (app) {
  const payload = async () => {
    const counts = await app.db.getMetaCounts()
    return {
      service: 'connector-dre',
      version: VERSION,
      description: 'Portuguese legislation from the Diário da República (I and II Series)',
      source: SOURCE_HOME,
      source_feeds: [
        'https://files.diariodarepublica.pt/rss/serie1.xml',
        'https://files.diariodarepublica.pt/rss/serie2.xml'
      ],
      dre: SOURCE_DRE,
      update_frequency: 'every 5 minutes',
      record_count: counts.record_count,
      by_series: counts.by_series,
      last_updated: counts.last_updated,
      last_error: counts.last_error,
      note: 'RSS covers the latest official issue; history accumulates in Mongo via periodic upserts.'
    }
  }

  app.get('/meta', async () => payload())
  app.get('/dre/meta', async () => payload())
}
