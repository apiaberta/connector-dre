import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

export function fixture (name) {
  return readFileSync(join(FIXTURES, name), 'utf8')
}

export function mockFetch (responses) {
  return async (url) => {
    const body = responses[url]
    if (body == null) {
      return {
        ok: false,
        status: 404,
        async text () { return 'not found' }
      }
    }
    if (body instanceof Error) throw body
    return {
      ok: true,
      status: 200,
      async text () { return body }
    }
  }
}

export const FEED_URLS = {
  I: 'https://files.diariodarepublica.pt/rss/serie1.xml',
  II: 'https://files.diariodarepublica.pt/rss/serie2.xml'
}

export function fixtureFetch () {
  return mockFetch({
    [FEED_URLS.I]: fixture('serie1.xml'),
    [FEED_URLS.II]: fixture('serie2.xml')
  })
}
