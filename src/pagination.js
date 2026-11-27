import { LATEST_DEFAULT, LIST_DEFAULT, LIST_MAX } from './config.js'

export function parsePageLimit (query = {}, { def = LIST_DEFAULT, max = LIST_MAX } = {}) {
  let page = parseInt(query.page, 10)
  let limit = parseInt(query.limit, 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  if (!Number.isFinite(limit) || limit < 1) limit = def
  if (limit > max) limit = max
  return { page, limit }
}

export function latestPagination (query = {}) {
  return parsePageLimit(query, { def: LATEST_DEFAULT, max: LIST_MAX })
}
