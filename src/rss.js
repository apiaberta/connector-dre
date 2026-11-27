import { FETCH_TIMEOUT_MS, RSS_FEEDS, USER_AGENT } from './config.js'
import { normalizeDiploma } from './parse.js'

function stripCdata (value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim()
}

function decodeEntities (value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

function tagText (xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = xml.match(re)
  if (!match) return ''
  return decodeEntities(stripCdata(match[1])).replace(/\s+/g, ' ').trim()
}

export function parseRssItems (xml) {
  if (!xml) return []
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = re.exec(xml))) {
    items.push({
      title: tagText(match[1], 'title'),
      description: tagText(match[1], 'description'),
      link: tagText(match[1], 'link')
    })
  }
  return items
}

export async function fetchFeedXml (url, { fetchImpl = fetch, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function loadFeedDiplomas (feed, opts = {}) {
  const xml = await fetchFeedXml(feed.url, opts)
  const items = parseRssItems(xml)
  const diplomas = []
  let skipped = 0
  for (const item of items) {
    const doc = normalizeDiploma(item, feed.series)
    if (!doc) {
      skipped += 1
      continue
    }
    diplomas.push(doc)
  }
  return { series: feed.series, url: feed.url, items: items.length, skipped, diplomas }
}

export async function loadAllFeeds (opts = {}) {
  const feeds = opts.feeds || RSS_FEEDS
  const results = []
  for (const feed of feeds) {
    try {
      results.push(await loadFeedDiplomas(feed, opts))
    } catch (err) {
      results.push({
        series: feed.series,
        url: feed.url,
        error: err.message,
        diplomas: []
      })
    }
  }
  return results
}
