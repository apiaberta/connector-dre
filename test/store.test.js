import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryStore } from '../src/store.js'

const SAMPLE = [
  {
    id: 'decreto-lei-218-2026',
    title: 'Decreto-Lei n.º 218/2026',
    type: 'Decreto-Lei',
    series: 'I',
    number: '218/2026',
    date: '2026-11-26',
    emitter: 'Presidência do Conselho de Ministros',
    summary: 'Reintegra no Instituto Nacional de Estatística, I. P.',
    url: 'https://files.diariodarepublica.pt/1s/2026/11/23000/0000200032.pdf'
  },
  {
    id: 'despacho-14474-2026',
    title: 'Despacho n.º 14474/2026',
    type: 'Despacho',
    series: 'II',
    number: '14474/2026',
    date: '2026-11-26',
    emitter: 'Presidência do Conselho de Ministros',
    summary: 'Designa Francisco da Costa Raposo.',
    url: 'https://files.diariodarepublica.pt/2s/example.pdf'
  },
  {
    id: 'portaria-10-2025',
    title: 'Portaria n.º 10/2025',
    type: 'Portaria',
    series: 'I',
    number: '10/2025',
    date: '2025-01-02',
    emitter: 'Finanças',
    summary: 'Aprova o modelo de declaração.',
    url: 'https://files.diariodarepublica.pt/1s/example.pdf'
  }
]

describe('memory store upsert + query', () => {
  it('upserts by id without duplicating', async () => {
    const db = createMemoryStore()
    await db.upsertDiplomas(SAMPLE)
    await db.upsertDiplomas([{ ...SAMPLE[0], summary: 'updated summary' }])
    const all = await db.listDiplomas({}, { page: 1, limit: 20 })
    assert.equal(all.total, 3)
    const updated = all.data.find((d) => d.id === 'decreto-lei-218-2026')
    assert.equal(updated.summary, 'updated summary')
    assert.equal(Object.keys(updated).sort().join(','), 'date,emitter,id,number,series,summary,title,type,url')
  })

  it('filters series/type/q/date and paginates', async () => {
    const db = createMemoryStore(SAMPLE)

    const series1 = await db.listDiplomas({ series: '1' }, { page: 1, limit: 20 })
    assert.equal(series1.total, 2)
    assert.ok(series1.data.every((d) => d.series === 'I'))

    const type = await db.listDiplomas({ type: 'Despacho' }, { page: 1, limit: 20 })
    assert.equal(type.total, 1)
    assert.equal(type.data[0].id, 'despacho-14474-2026')

    const q = await db.listDiplomas({ q: 'Estatística' }, { page: 1, limit: 20 })
    assert.equal(q.total, 1)
    assert.equal(q.data[0].id, 'decreto-lei-218-2026')

    const date = await db.listDiplomas({ date: '2026-11-26' }, { page: 1, limit: 20 })
    assert.equal(date.total, 2)

    const page = await db.listDiplomas({}, { page: 2, limit: 1 })
    assert.equal(page.total, 3)
    assert.equal(page.data.length, 1)
    assert.equal(page.page, 2)
    assert.equal(page.limit, 1)
    assert.equal(page.data[0].date <= '2026-11-26', true)
  })
})
