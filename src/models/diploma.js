import mongoose from 'mongoose'

const diplomaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: '' },
  type: { type: String, default: '', index: true },
  series: { type: String, default: '', index: true },
  number: { type: String, default: '' },
  date: { type: String, default: '', index: true },
  emitter: { type: String, default: '' },
  summary: { type: String, default: '' },
  url: { type: String, default: '' },
  synced_at: { type: Date, default: Date.now }
}, {
  collection: 'diplomas',
  versionKey: false
})

diplomaSchema.index({ date: -1, id: -1 })
diplomaSchema.index({ series: 1, date: -1 })

export const Diploma = mongoose.models.Diploma || mongoose.model('Diploma', diplomaSchema)
