const TITLE_RE = /^(.+?)\s+n\.?[ºo°]\s+(\S+)\s*-\s*Diário da República n\.?[ºo°]\s+(\S+)(?:,\s*Suplemento)?,\s*Série\s+(I{1,3}|[123])\s+de\s+(\d{4}-\d{2}-\d{2})/i

const SUMMARY_STARTERS = [
  'Abre', 'Abertura', 'Actualiza', 'Adita', 'Adota', 'Adopta', 'Altera', 'Anexa',
  'Aprova', 'Atribui', 'Atualiza', 'Autoriza', 'Cessa', 'Confere', 'Constitui',
  'Convoca', 'Corrige', 'Cria', 'Declara', 'Define', 'Delibera', 'Desanexa',
  'Designa', 'Determina', 'Devolve', 'Elimina', 'Encerra', 'Esclarece',
  'Estabelece', 'Exonera', 'Exoneração', 'Fixa', 'Homologa', 'Indica',
  'Institui', 'Louva', 'Menciona', 'Nomeação', 'Nomeações', 'Nomeia',
  'Primeira', 'Procede', 'Procedimento', 'Promulga', 'Prorroga', 'Publica',
  'Publicita', 'Quarta', 'Quinta', 'Ratifica', 'Regista', 'Regulamenta',
  'Reintegra', 'Republica', 'Resolve', 'Retifica', 'Revoga', 'Segunda',
  'Sexta', 'Subdelega', 'Suspende', 'Sétima', 'Terceira', 'Transfere',
  'Transpõe', 'Décima', 'Oitava', 'Nona'
]

const SUMMARY_SPLIT_RE = new RegExp(
  `^(.*?)\\s+(${SUMMARY_STARTERS.join('|')})\\b([\\s\\S]*)$`,
  'u'
)

export function normalizeSeries (value) {
  if (value == null || value === '') return null
  const v = String(value).trim().toUpperCase()
  if (v === '1' || v === 'I' || v === '1-A' || v === 'I-A') return 'I'
  if (v === '2' || v === 'II') return 'II'
  if (v === '3' || v === 'III') return 'III'
  return null
}

export function escapeRegex (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function slugify (value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/n\.?[ºo°]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function diplomaId ({ type, number, title, url }) {
  if (type && number) {
    const id = slugify(`${type} ${number}`)
    if (id) return id
  }
  if (title) {
    const id = slugify(title.split(' - ')[0] || title)
    if (id) return id
  }
  if (url) {
    const id = slugify(url.replace(/^https?:\/\//, ''))
    if (id) return id
  }
  return null
}

export function splitEmitterSummary (description) {
  const text = String(description || '').replace(/\s+/g, ' ').trim()
  if (!text) return { emitter: '', summary: '' }

  const match = text.match(SUMMARY_SPLIT_RE)
  if (match) {
    const emitter = match[1].trim()
    const summary = `${match[2]}${match[3]}`.trim()
    if (emitter && summary) return { emitter, summary }
  }

  return { emitter: '', summary: text }
}

export function parseTitle (rawTitle) {
  const title = String(rawTitle || '').replace(/\s+/g, ' ').trim()
  const match = title.match(TITLE_RE)
  if (!match) {
    return {
      title,
      type: '',
      number: '',
      journal: '',
      series: null,
      date: ''
    }
  }

  const type = match[1].trim()
  const number = match[2].replace(/[.,]+$/, '')
  const journal = match[3].replace(/[.,]+$/, '')
  const series = normalizeSeries(match[4])
  const date = match[5]

  return {
    title: `${type} n.º ${number}`,
    type,
    number,
    journal,
    series,
    date
  }
}

export function toIsoDate (value) {
  if (!value) return ''
  const text = String(value).trim()
  const day = text.match(/^(\d{4}-\d{2}-\d{2})/)
  return day ? day[1] : ''
}

const ATTACHMENT_RE = /\.(jpe?g|png|gif|webp|tif{1,2}|bmp|svg)(?:\?|$)/i

/** RSS feeds include annex images next to the diploma PDF. Keep the PDF only. */
export function isAttachmentUrl (url) {
  if (!url) return false
  return ATTACHMENT_RE.test(String(url).split('#')[0])
}

/**
 * Turn a raw RSS item (title, description, link) plus the feed series
 * into a normalised diploma document.
 */
export function normalizeDiploma (item, feedSeries = null) {
  const parsed = parseTitle(item.title)
  const { emitter, summary } = splitEmitterSummary(item.description)
  const series = parsed.series || normalizeSeries(feedSeries)
  const url = String(item.link || item.url || '').trim()
  if (isAttachmentUrl(url)) return null
  const date = toIsoDate(parsed.date || item.date)
  const id = diplomaId({
    type: parsed.type,
    number: parsed.number,
    title: parsed.title || item.title,
    url
  })

  if (!id) return null

  return {
    id,
    title: parsed.title || String(item.title || '').trim(),
    type: parsed.type || '',
    series: series || '',
    number: parsed.number || '',
    date,
    emitter,
    summary,
    url
  }
}
