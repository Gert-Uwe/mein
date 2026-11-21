import assert from 'node:assert/strict'
import test from 'node:test'
import { parseReadingsCsv } from '../src/csv.ts'

const header = '"Datum";"Uhrzeit";"Systolisch (mmHg)";"Diastolisch (mmHg)";"Puls (bpm)";"Kommentar"\r\n'

test('liest Exportformat mit Trennzeichen, Anführungszeichen und Zeilenumbruch im Kommentar', () => {
  const csv = `\uFEFF${header}"2026-11-21";"08:30";"120";"80";"65";"Nachricht; mit ""Zitat""\nzweite Zeile"\r\n`
  const [reading] = parseReadingsCsv(csv)
  assert.equal(reading.measuredAt, '2026-11-21T08:30')
  assert.equal(reading.systolic, 120)
  assert.equal(reading.diastolic, 80)
  assert.equal(reading.pulse, 65)
  assert.equal(reading.comment, 'Nachricht; mit "Zitat"\nzweite Zeile')
})

test('stellt einen für Tabellenkalkulationen geschützten Kommentar wieder her', () => {
  const [reading] = parseReadingsCsv(`${header}"2026-11-21";"08:30";"120";"80";"65";"'=1+1"\r\n`)
  assert.equal(reading.comment, '=1+1')
})

test('weist unvollständige oder ungültige Dateien vor dem Ersetzen zurück', () => {
  assert.throws(() => parseReadingsCsv('Datum;Uhrzeit\n'), /CSV-Spalten/)
  assert.throws(() => parseReadingsCsv(header), /keine Messungen/)
  assert.throws(() => parseReadingsCsv(`${header}"2026-02-30";"08:30";"120";"80";"65";""\n`), /Datum oder Uhrzeit/)
  assert.throws(() => parseReadingsCsv(`${header}"2026-11-21";"08:30";"120";"80";"65"\n`), /sechs Spalten/)
  assert.throws(() => parseReadingsCsv(`${header}"2026-11-21";"08:30";"80";"120";"65";""\n`), /Systolisch muss größer/)
})
