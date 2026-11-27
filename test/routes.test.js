import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { createMemoryStore } from '../src/store.js'
import { syncAll } from '../src/sync.js'
import { fixtureFetch } from './helpers.js'

describe('routes', () => {
  let app
  let db
  let originalFetch

  before(async () => {
    originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error('routes tests must not call the network')
    }
    db = createMemoryStore()
    await syncAll({ db, fetchImpl: fixtureFetch() })
    app = await buildApp({ logger: false, db })
  })

  after(async () => {
    globalThis.fetch = originalFetch
    await app.close()
  })

  it('GET /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.status, 'ok')
    assert.equal(body.service, 'connector-dre')
  })

  it('GET /dre/latest returns { data, total, page, limit } with stable ids', async () => {
    const res = await app.inject({ method: 'GET', url: '/dre/latest' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.ok(Array.isArray(body.data))
    assert.ok(body.data.length > 0)
    assert.equal(typeof body.total, 'number')
    assert.equal(body.page, 1)
    assert.ok(body.limit >= body.data.length)
    const item = body.data[0]
    for (const key of ['id', 'title', 'type', 'series', 'number', 'date', 'emitter', 'summary', 'url']) {
      assert.ok(key in item, `missing ${key}`)
    }
    assert.match(item.series, /^(I|II)$/)
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(item.id)
    assert.equal(body.data.some((d) => typeof d.message === 'string'), false)
  })

  it('GET /dre/legislation supports series/type/q/date and pagination', async () => {
    const series = await app.inject({ method: 'GET', url: '/dre/legislation?series=I' })
    assert.equal(series.statusCode, 200)
    const seriesBody = series.json()
    assert.ok(seriesBody.data.every((d) => d.series === 'I'))
    assert.equal(seriesBody.total, 5)

    const type = await app.inject({ method: 'GET', url: '/dre/legislation?type=Decreto-Lei' })
    const typeBody = type.json()
    assert.ok(typeBody.data.length >= 2)
    assert.ok(typeBody.data.every((d) => /Decreto-Lei/i.test(d.type)))

    const q = await app.inject({ method: 'GET', url: '/dre/legislation?q=Floresta' })
    assert.equal(q.json().total, 1)
    assert.match(q.json().data[0].summary, /Floresta Ativa/)

    const date = await app.inject({ method: 'GET', url: '/dre/legislation?date=2026-11-25' })
    assert.ok(date.json().total >= 1)
    assert.ok(date.json().data.every((d) => d.date === '2026-11-25'))

    const page = await app.inject({ method: 'GET', url: '/dre/legislation?page=2&limit=3' })
    const pageBody = page.json()
    assert.equal(pageBody.page, 2)
    assert.equal(pageBody.limit, 3)
    assert.equal(pageBody.data.length, 3)
    assert.equal(pageBody.total, 8)
  })

  it('GET /dre/search requires q and searches the cache', async () => {
    const missing = await app.inject({ method: 'GET', url: '/dre/search' })
    assert.equal(missing.statusCode, 400)

    const res = await app.inject({ method: 'GET', url: '/dre/search?q=VISAPRESS' })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().total, 1)
    assert.equal(res.json().data[0].id, 'decreto-lei-219-2026')
  })

  it('GET /dre/legislation/:id', async () => {
    const res = await app.inject({ method: 'GET', url: '/dre/legislation/decreto-lei-218-2026' })
    assert.equal(res.statusCode, 200)
    assert.equal(res.json().data.number, '218/2026')

    const missing = await app.inject({ method: 'GET', url: '/dre/legislation/does-not-exist' })
    assert.equal(missing.statusCode, 404)
  })

  it('GET /meta reports the official RSS source', async () => {
    const res = await app.inject({ method: 'GET', url: '/meta' })
    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.match(body.source, /diariodarepublica\.pt/)
    assert.equal(body.record_count, 8)
    assert.ok(body.source_feeds.some((u) => u.includes('serie1.xml')))
  })
})
