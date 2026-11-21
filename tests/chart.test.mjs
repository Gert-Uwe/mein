import assert from 'node:assert/strict'
import test from 'node:test'
import { axisTicks, weekends } from '../src/chartScale.ts'
import { inTimeOfDay } from '../src/periods.ts'

test('Tageszeitgrenzen sind eindeutig zugeordnet', () => {
  assert.equal(inTimeOfDay('2026-11-21T09:59', 'morning'), true)
  assert.equal(inTimeOfDay('2026-11-21T10:00', 'morning'), false)
  assert.equal(inTimeOfDay('2026-11-21T10:00', 'midday'), true)
  assert.equal(inTimeOfDay('2026-11-21T15:59', 'midday'), true)
  assert.equal(inTimeOfDay('2026-11-21T16:00', 'midday'), false)
  assert.equal(inTimeOfDay('2026-11-21T16:00', 'evening'), true)
  assert.equal(inTimeOfDay('2026-11-21T23:59', 'evening'), true)
  assert.equal(inTimeOfDay('2026-11-21T16:00', 'all'), true)
})

test('Zeitachse verwendet Stunden, Tage und Monate passend zum Zeitraum', () => {
  const day = axisTicks({ start: new Date(2026, 10, 21), end: new Date(2026, 10, 22) })
  const week = axisTicks({ start: new Date(2026, 10, 16), end: new Date(2026, 10, 23) })
  const year = axisTicks({ start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) })
  assert.ok(day.some((tick) => tick.label.includes('Uhr')))
  assert.ok(week.some((tick) => tick.label.includes('Mo')))
  assert.ok(year.some((tick) => tick.label.includes('26')))
  assert.ok(year.length <= 8)
})

test('Wochenenden umfassen Samstag und Sonntag, auch bei Teilzeiträumen', () => {
  const saturday = new Date(2026, 10, 21)
  const monday = new Date(2026, 10, 23)
  const range = { start: new Date(2026, 10, 20), end: new Date(2026, 10, 24) }
  assert.deepEqual(weekends(range), [{ start: saturday.getTime(), end: monday.getTime() }])
  const sundayOnly = { start: new Date(2026, 10, 22, 12), end: new Date(2026, 10, 22, 18) }
  assert.deepEqual(weekends(sundayOnly), [{ start: sundayOnly.start.getTime(), end: sundayOnly.end.getTime() }])
})
