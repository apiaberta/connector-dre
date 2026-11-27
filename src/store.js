import { Diploma } from './models/diploma.js'
import { escapeRegex, normalizeSeries } from './parse.js'

export const PUBLIC_FIELDS = ['id', 'title', 'type', 'series', 'number', 'date', 'emitter', 'summary', 'url']

export function toPublicDiploma (doc) {
  if (!doc) return null
  const out = {}
  for (const key of PUBLIC_FIELDS) out[key] = doc[key] ?? (key === 'series' ? '' : '')
  return out
}

export function buildDiplomaFilter ({ series, type, q, date } = {}) {
  const filter = {}
  const normalised = normalizeSeries(series)
  if (normalised) filter.series = normalised
  if (type && String(type).trim()) {
    filter.type = { $regex: escapeRegex(String(type).trim()), $options: 'i' }
  }
  const isoDate = date ? String(date).trim().slice(0, 10) : ''
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    filter.date = isoDate
  }
  if (q && String(q).trim()) {
    const spec = { $regex: escapeRegex(String(q).trim()), $options: 'i' }
    filter.$or = [
      { title: spec },
      { summary: spec },
      { emitter: spec },
      { type: spec },
      { number: spec }
    ]
  }
  return filter
}

function asRegExp (spec) {
  if (spec instanceof RegExp) return spec
  if (spec && typeof spec === 'object' && spec.$regex != null) {
    return new RegExp(spec.$regex, spec.$options || '')
  }
  return null
}

function matchesFilter (doc, filter) {
  if (filter.series && doc.series !== filter.series) return false
  if (filter.date && doc.date !== filter.date) return false
  if (filter.type) {
    const re = asRegExp(filter.type)
    if (re && !re.test(doc.type || '')) return false
  }
  if (filter.$or) {
    const ok = filter.$or.some((clause) => {
      const [key, spec] = Object.entries(clause)[0]
      const re = asRegExp(spec)
      return re ? re.test(String(doc[key] || '')) : doc[key] === spec
    })
    if (!ok) return false
  }
  return true
}

function sortDiplomas (rows) {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    if (a.id !== b.id) return a.id < b.id ? 1 : -1
    return 0
  })
}

export function createMemoryStore (seed = []) {
  const docs = seed.map((d) => ({ ...d }))
  let lastSync = null
  let lastError = null

  return {
    kind: 'memory',
    async upsertDiplomas (diplomas) {
      const now = new Date()
      let upserted = 0
      for (const diploma of diplomas) {
        if (!diploma?.id) continue
        const idx = docs.findIndex((d) => d.id === diploma.id)
        const next = { ...diploma, synced_at: now }
        if (idx >= 0) docs[idx] = { ...docs[idx], ...next }
        else docs.push(next)
        upserted += 1
      }
      return { upserted, total: diplomas.length }
    },
    async listDiplomas (query, { page, limit } = {}) {
      const filter = buildDiplomaFilter(query)
      const matched = sortDiplomas(docs.filter((d) => matchesFilter(d, filter)))
      const total = matched.length
      const start = (page - 1) * limit
      const data = matched.slice(start, start + limit).map(toPublicDiploma)
      return { data, total, page, limit }
    },
    async countDiplomas (query = {}) {
      const filter = buildDiplomaFilter(query)
      return docs.filter((d) => matchesFilter(d, filter)).length
    },
    async getDiploma (id) {
      const doc = docs.find((d) => d.id === id)
      return toPublicDiploma(doc)
    },
    async markSync ({ at = new Date(), error = null } = {}) {
      lastSync = at
      lastError = error
    },
    async getMetaCounts () {
      const bySeries = { I: 0, II: 0 }
      for (const doc of docs) {
        if (bySeries[doc.series] != null) bySeries[doc.series] += 1
      }
      return {
        record_count: docs.length,
        by_series: bySeries,
        last_updated: lastSync ? lastSync.toISOString() : null,
        last_error: lastError
      }
    }
  }
}

export function createMongoStore ({ model = Diploma } = {}) {
  return {
    kind: 'mongo',
    async upsertDiplomas (diplomas) {
      const now = new Date()
      const ops = diplomas
        .filter((d) => d?.id)
        .map((diploma) => ({
          updateOne: {
            filter: { id: diploma.id },
            update: { $set: { ...diploma, synced_at: now } },
            upsert: true
          }
        }))
      if (ops.length === 0) return { upserted: 0, total: 0 }
      const result = await model.bulkWrite(ops, { ordered: false })
      const upserted = (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0)
      return { upserted, total: diplomas.length }
    },
    async listDiplomas (query, { page, limit } = {}) {
      const filter = buildDiplomaFilter(query)
      const skip = (page - 1) * limit
      const [total, rows] = await Promise.all([
        model.countDocuments(filter),
        model.find(filter).sort({ date: -1, id: -1 }).skip(skip).limit(limit).lean()
      ])
      return { data: rows.map(toPublicDiploma), total, page, limit }
    },
    async countDiplomas (query = {}) {
      return model.countDocuments(buildDiplomaFilter(query))
    },
    async getDiploma (id) {
      const doc = await model.findOne({ id }).lean()
      return toPublicDiploma(doc)
    },
    async markSync ({ at = new Date(), error = null } = {}) {
      await model.db.collection('sync_state').updateOne(
        { _id: 'dre' },
        { $set: { last_updated: at, last_error: error } },
        { upsert: true }
      )
    },
    async getMetaCounts () {
      const [record_count, seriesI, seriesII, state] = await Promise.all([
        model.countDocuments(),
        model.countDocuments({ series: 'I' }),
        model.countDocuments({ series: 'II' }),
        model.db.collection('sync_state').findOne({ _id: 'dre' })
      ])
      return {
        record_count,
        by_series: { I: seriesI, II: seriesII },
        last_updated: state?.last_updated ? new Date(state.last_updated).toISOString() : null,
        last_error: state?.last_error || null
      }
    }
  }
}
