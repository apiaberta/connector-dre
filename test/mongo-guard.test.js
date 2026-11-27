import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assertSafeMongoUri, isLocalMongoUri, looksLikeProductionMongoUri } from '../src/mongo.js'

describe('mongo URI guard', () => {
  it('accepts local hosts', () => {
    assert.equal(isLocalMongoUri('mongodb://localhost:27017/apiaberta-dre'), true)
    assert.equal(isLocalMongoUri('mongodb://127.0.0.1:27017/apiaberta-dre'), true)
    assert.equal(isLocalMongoUri('mongodb://mongo:27017/apiaberta-dre'), true)
  })

  it('rejects Atlas / production-looking URIs', () => {
    assert.equal(looksLikeProductionMongoUri('mongodb+srv://user:pass@cluster.mongodb.net/apiaberta-dre'), true)
    assert.equal(looksLikeProductionMongoUri('mongodb://prod.apiaberta.pt:27017/dre'), true)
    assert.equal(isLocalMongoUri('mongodb+srv://cluster.mongodb.net/dre'), false)
  })

  it('refuses non-local URIs in development', () => {
    assert.throws(
      () => assertSafeMongoUri('mongodb+srv://user:pass@cluster.mongodb.net/dre', 'development'),
      /Refusing to connect/
    )
  })

  it('never connects during tests', () => {
    assert.throws(
      () => assertSafeMongoUri('mongodb://localhost:27017/apiaberta-dre', 'test'),
      /must not connect to MongoDB/
    )
  })
})
