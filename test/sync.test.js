import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStore } from '../src/store.js'
import { syncAll } from '../src/sync.js'
import { FEED_URLS, fixtureFetch, mockFetch, fixture } from './helpers.js'

describe('syncAll', () => {
  it('upserts diplomas from both official RSS feeds', async () => {
    const db = createMemoryStore()
    const summary = await syncAll({ db, fetchImpl: fixtureFetch() })
    assert.equal(summary.errors, 0)
    assert.equal(summary.fetched, 8)
    assert.equal(summary.upserted, 8)

    const listed = await db.listDiplomas({}, { page: 1, limit: 20 })
    assert.equal(listed.total, 8)
    assert.ok(listed.data.some((d) => d.id === 'decreto-lei-218-2026'))
    assert.ok(listed.data.some((d) => d.series === 'II'))
    assert.ok(listed.data.every((d) => !d.url.endsWith('.jpg')))

    const meta = await db.getMetaCounts()
    assert.equal(meta.record_count, 8)
    assert.equal(meta.by_series.I, 5)
    assert.equal(meta.by_series.II, 3)
    assert.ok(meta.last_updated)
  })

  it('is idempotent across runs', async () => {
    const db = createMemoryStore()
    const fetchImpl = fixtureFetch()
    await syncAll({ db, fetchImpl })
    await syncAll({ db, fetchImpl })
    const listed = await db.listDiplomas({}, { page: 1, limit: 100 })
    assert.equal(listed.total, 8)
  })

  it('keeps cached data when a feed fails', async () => {
    const db = createMemoryStore()
    await syncAll({ db, fetchImpl: fixtureFetch() })

    const failing = mockFetch({
      [FEED_URLS.I]: new Error('network down'),
      [FEED_URLS.II]: fixture('serie2.xml')
    })
    const summary = await syncAll({ db, fetchImpl: failing })
    assert.equal(summary.errors, 1)
    const listed = await db.listDiplomas({}, { page: 1, limit: 100 })
    assert.equal(listed.total, 8)
  })
})
