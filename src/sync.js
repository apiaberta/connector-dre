import { RSS_FEEDS } from './config.js'
import { loadAllFeeds } from './rss.js'

export async function syncAll ({ db, fetchImpl, feeds = RSS_FEEDS, log } = {}) {
  if (!db) throw new Error('syncAll requires a store (db)')

  const feedResults = await loadAllFeeds({ fetchImpl, feeds })
  const summary = {
    feeds: [],
    upserted: 0,
    fetched: 0,
    errors: 0
  }

  for (const feed of feedResults) {
    if (feed.error) {
      summary.errors += 1
      summary.feeds.push({ series: feed.series, error: feed.error, upserted: 0 })
      log?.error?.({ series: feed.series, err: feed.error }, 'DRE RSS feed failed')
      continue
    }
    const { upserted, total } = await db.upsertDiplomas(feed.diplomas)
    summary.upserted += upserted
    summary.fetched += total
    summary.feeds.push({
      series: feed.series,
      fetched: total,
      skipped: feed.skipped || 0,
      upserted
    })
    log?.info?.(
      { series: feed.series, fetched: total, upserted },
      'DRE RSS feed synced'
    )
  }

  await db.markSync({
    at: new Date(),
    error: summary.errors === feedResults.length && feedResults.length > 0
      ? 'all feeds failed'
      : null
  })

  return summary
}
