export const SERVICE_NAME = 'connector-dre'
export const VERSION = '1.1.0'
export const PORT = parseInt(process.env.PORT || '3015', 10)
export const NODE_ENV = process.env.NODE_ENV || 'development'

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/apiaberta-dre'
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'apiaberta-dre'

export const USER_AGENT = 'apiaberta.pt/1.0 (connector-dre; +https://apiaberta.pt)'
export const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS || '15000', 10)

export const LIST_DEFAULT = 20
export const LIST_MAX = 100
export const LATEST_DEFAULT = 50

/** Official INCM RSS feeds for the current Diário da República issue. */
export const RSS_FEEDS = [
  {
    series: 'I',
    url: 'https://files.diariodarepublica.pt/rss/serie1.xml'
  },
  {
    series: 'II',
    url: 'https://files.diariodarepublica.pt/rss/serie2.xml'
  }
]

export const SOURCE_HOME = 'https://diariodarepublica.pt'
export const SOURCE_DRE = 'https://dre.pt'

/** Every 5 minutes — matches the gateway webhook poll interval. */
export const SYNC_CRON = process.env.SYNC_CRON || '*/5 * * * *'
