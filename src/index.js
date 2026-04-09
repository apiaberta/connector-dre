import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const SERVICE_NAME = 'connector-dre'
const PORT = parseInt(process.env.PORT || '3015')

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined
  }
})

// ─── Swagger ─────────────────────────────────────────────────────────────────

await app.register(swagger, {
  openapi: {
    info: {
      title: 'API Aberta - DRE Legislation Connector',
      description: 'Portuguese legislation from Diário da República (DRE). Note: The official DRE API requires specific session handling.',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [
      { name: 'DRE', description: 'Diário da República legislation search' },
    ],
  },
})

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list' },
})

app.get('/swagger', async () => app.swagger())

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', async () => ({
  status: 'ok',
  service: SERVICE_NAME,
  version: '1.0.0',
  timestamp: new Date().toISOString()
}))

// ─── Meta ────────────────────────────────────────────────────────────────────

app.get('/meta', async () => ({
  service: SERVICE_NAME,
  version: '1.0.0',
  description: 'Portuguese legislation from Diário da República',
  source: 'https://dre.pt',
  note: 'DRE search requires session handling. For direct access use https://dre.pt'
}))

// ─── Series ──────────────────────────────────────────────────────────────────

app.get('/dre/series', {
  schema: {
    description: 'List available DRE series',
    tags: ['DRE']
  }
}, async () => {
  return {
    series: [
      { id: '1', name: 'I Série', description: 'Legislative acts, laws, decrees' },
      { id: '2', name: 'II Série', description: 'Administrative acts' },
      { id: '3', name: 'III Série', description: 'Various notices and announcements' },
      { id: '1-A', name: 'I Série-A', description: 'Assembly of the Republic' },
    ]
  }
})

// ─── Search ──────────────────────────────────────────────────────────────────

app.get('/dre/search', {
  schema: {
    description: 'Search DRE legislation (proxies to dre.pt search)',
    tags: ['DRE'],
    querystring: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search term (required)' },
        series: { type: 'string', default: '1', description: 'DRE series (1, 2, 3, 1-A)' },
        year: { type: 'string', description: 'Year (e.g. 2024)' },
        page: { type: 'integer', default: 1, minimum: 1 }
      },
      required: ['q']
    }
  }
}, async (req, reply) => {
  const { q, series = '1', year, page = 1 } = req.query

  if (!q?.trim()) {
    return reply.code(400).send({ error: 'q parameter is required' })
  }

  // Build DRE search URL
  const params = new URLSearchParams({
    texto: q,
    serie: series,
    ...(year && { ano: year }),
    pagina: String(page)
  })

  const dreUrl = `https://dre.pt/pesquisa/?${params.toString()}`

  try {
    const res = await fetch(dreUrl, {
      headers: {
        'User-Agent': 'apiaberta.pt/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })

    if (!res.ok) throw new Error(`DRE HTTP ${res.status}`)

    const html = await res.text()

    // Extract result count
    const countMatch = html.match(/resultados?\s*<\/?[^>]+>\s*([\d\s]+)/i) ||
                       html.match(/([\d.]+)\s*resultados?/i) ||
                       html.match(/([\d.]+)\s*resultados?/i)

    // Check if we got actual content vs. error page
    const hasResults = html.includes('dre-result') || html.includes('resultado') || html.includes('diploma')

    return {
      query: q,
      series,
      year: year || null,
      page,
      search_url: dreUrl,
      results_html_available: hasResults,
      note: 'Full JSON results require DRE session/API. This endpoint returns HTML that needs parsing.',
      raw_content_length: html.length
    }
  } catch (err) {
    return { error: err.message, query: q }
  }
})

// ─── Latest ──────────────────────────────────────────────────────────────────

app.get('/dre/latest', {
  schema: {
    description: 'Get latest DRE publications (I Série)',
    tags: ['DRE'],
    querystring: {
      type: 'object',
      properties: {
        series: { type: 'string', default: '1' }
      }
    }
  }
}, async (req) => {
  const { series = '1' } = req.query

  return {
    message: 'Full latest publications require DRE screenservice API',
    hint: 'Access DRE directly at https://dre.pt/dr/home',
    series,
    source: 'https://dre.pt'
  }
})

// ─── Legislation types ────────────────────────────────────────────────────────

app.get('/dre/types', {
  schema: {
    description: 'Common DRE legislation types',
    tags: ['DRE']
  }
}, async () => {
  return {
    types: [
      { code: 'lei', name: 'Lei' },
      { code: 'dl', name: 'Decreto-Lei' },
      { code: 'dr', name: 'Decreto Regulamentar' },
      { code: 'portaria', name: 'Portaria' },
      { code: 'resolucao', name: 'Resolução' },
      { code: 'acordao', name: 'Acórdão' },
      { code: 'aviso', name: 'Aviso' },
      { code: 'edital', name: 'Edital' },
      { code: 'decl', name: 'Declaração' },
    ],
    source: 'https://dre.pt/legislacao'
  }
})


// ─── Legislation (generic list) ───────────────────────────────────────────────

app.get('/dre/legislation', {
  schema: {
    description: 'List recent legislation from DRE (I Série)',
    tags: ['DRE'],
    querystring: {
      type: 'object',
      properties: {
        series: { type: 'string', default: '1' },
        year: { type: 'string', description: 'Year (e.g. 2024)' },
        page: { type: 'integer', default: 1, minimum: 1 },
        limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 }
      }
    }
  }
}, async (req) => {
  const { series = '1', year, page = 1, limit = 20 } = req.query
  return {
    message: 'Full DRE legislation list requires screenservice API access',
    source: 'https://dre.pt',
    hint: 'Use /dre/search?q=term for text search',
    params: { series, year, page, limit }
  }
})

// ─── Startup ─────────────────────────────────────────────────────────────────

await app.listen({ port: PORT, host: '0.0.0.0' })
app.log.info(`${SERVICE_NAME} listening on port ${PORT}`)
