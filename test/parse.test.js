import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  diplomaId,
  normalizeDiploma,
  normalizeSeries,
  parseTitle,
  splitEmitterSummary
} from '../src/parse.js'
import { parseRssItems } from '../src/rss.js'
import { fixture } from './helpers.js'

describe('normalizeSeries', () => {
  it('maps 1/I and 2/II', () => {
    assert.equal(normalizeSeries('1'), 'I')
    assert.equal(normalizeSeries('I'), 'I')
    assert.equal(normalizeSeries('i'), 'I')
    assert.equal(normalizeSeries('2'), 'II')
    assert.equal(normalizeSeries('II'), 'II')
  })
})

describe('parseTitle', () => {
  it('parses a Decreto-Lei heading', () => {
    const parsed = parseTitle('Decreto-Lei n.º 218/2026  -  Diário da República n.º 230/2026, Série I de 2026-11-26')
    assert.equal(parsed.type, 'Decreto-Lei')
    assert.equal(parsed.number, '218/2026')
    assert.equal(parsed.series, 'I')
    assert.equal(parsed.date, '2026-11-26')
    assert.equal(parsed.title, 'Decreto-Lei n.º 218/2026')
  })

  it('parses regional resolutions and supplement issues', () => {
    const acores = parseTitle('Resolução da Assembleia Legislativa da Região Autónoma dos Açores n.º 42/2026/A - Diário da República n.º 229/2026, Série I de 2026-11-25')
    assert.equal(acores.type, 'Resolução da Assembleia Legislativa da Região Autónoma dos Açores')
    assert.equal(acores.number, '42/2026/A')
    assert.equal(acores.series, 'I')

    const supl = parseTitle('Portaria n.º 10/2026  -  Diário da República n.º 229/2026, Suplemento, Série II de 2026-11-25')
    assert.equal(supl.type, 'Portaria')
    assert.equal(supl.series, 'II')
    assert.equal(supl.date, '2026-11-25')
  })
})

describe('splitEmitterSummary', () => {
  it('splits ministry + verb summary', () => {
    const a = splitEmitterSummary('Presidência do Conselho de Ministros Reintegra no Instituto Nacional de Estatística, I. P., a produção e difusão das respetivas estatísticas oficiais.')
    assert.equal(a.emitter, 'Presidência do Conselho de Ministros')
    assert.match(a.summary, /^Reintegra /)

    const b = splitEmitterSummary('Presidência do Conselho de Ministros - Secretaria-Geral do Governo Retifica a Resolução do Conselho de Ministros n.º 198/2026, de 14 de outubro.')
    assert.equal(b.emitter, 'Presidência do Conselho de Ministros - Secretaria-Geral do Governo')
    assert.match(b.summary, /^Retifica /)
  })
})

describe('diplomaId', () => {
  it('is stable for type + number', () => {
    assert.equal(
      diplomaId({ type: 'Decreto-Lei', number: '218/2026' }),
      'decreto-lei-218-2026'
    )
    assert.equal(
      diplomaId({ type: 'Declaração de Retificação', number: '41/2026/1' }),
      'declaracao-de-retificacao-41-2026-1'
    )
  })
})

describe('normalizeDiploma from official RSS fixtures', () => {
  it('maps série I items', () => {
    const items = parseRssItems(fixture('serie1.xml'))
    assert.equal(items.length, 5)
    const diplomas = items.map((item) => normalizeDiploma(item, 'I'))
    assert.equal(diplomas[0].id, 'decreto-lei-218-2026')
    assert.equal(diplomas[0].type, 'Decreto-Lei')
    assert.equal(diplomas[0].series, 'I')
    assert.equal(diplomas[0].date, '2026-11-26')
    assert.equal(diplomas[0].emitter, 'Presidência do Conselho de Ministros')
    assert.match(diplomas[0].url, /files\.diariodarepublica\.pt/)
    assert.equal(diplomas[3].type, 'Portaria')
    assert.equal(diplomas[3].number, '534/2026/1')
  })

  it('maps série II items including Aviso (extrato)', () => {
    const items = parseRssItems(fixture('serie2.xml'))
    const diplomas = items.map((item) => normalizeDiploma(item, 'II'))
    assert.equal(diplomas[0].series, 'II')
    assert.equal(diplomas[0].type, 'Despacho')
    assert.equal(diplomas[1].type, 'Aviso (extrato)')
    assert.equal(diplomas[1].id, 'aviso-extrato-29448-2026-2')
    assert.match(diplomas[1].summary, /^Procedimento /)
    assert.equal(diplomas[3], null, 'jpg annexes are skipped')
  })
})
