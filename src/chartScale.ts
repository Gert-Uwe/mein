import type { DateRange } from './periods.ts'

export type AxisTick = { at: number; label: string }
export type TimeInterval = { start: number; end: number }

export function axisTicks(range: DateRange): AxisTick[] {
  const ticks: AxisTick[] = []
  const start = range.start.getTime()
  const end = range.end.getTime()
  const days = (end - start) / 86_400_000
  const cursor = new Date(range.start)

  if (days <= 2) {
    const step = days <= 1 ? 4 : 6
    cursor.setMinutes(0, 0, 0)
    cursor.setHours(Math.ceil(cursor.getHours() / step) * step)
    while (cursor.getTime() < end) {
      if (cursor.getTime() >= start) ticks.push({ at: cursor.getTime(), label: `${cursor.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${String(cursor.getHours()).padStart(2, '0')} Uhr` })
      cursor.setHours(cursor.getHours() + step)
    }
  } else if (days <= 14) {
    const step = days <= 7 ? 1 : 2
    cursor.setHours(0, 0, 0, 0)
    if (cursor.getTime() < start) cursor.setDate(cursor.getDate() + 1)
    while (cursor.getTime() < end) {
      ticks.push({ at: cursor.getTime(), label: cursor.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) })
      cursor.setDate(cursor.getDate() + step)
    }
  } else if (days <= 90) {
    const step = days <= 45 ? 7 : 14
    cursor.setHours(0, 0, 0, 0)
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
    while (cursor.getTime() < start) cursor.setDate(cursor.getDate() + step)
    while (cursor.getTime() < end) {
      ticks.push({ at: cursor.getTime(), label: cursor.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) })
      cursor.setDate(cursor.getDate() + step)
    }
  } else {
    const months = days / 30.44
    const step = [1, 2, 3, 6, 12, 24, 60].find((item) => months / item <= 7) ?? Math.ceil(months / 7)
    cursor.setDate(1)
    cursor.setHours(0, 0, 0, 0)
    while (cursor.getTime() < start) cursor.setMonth(cursor.getMonth() + step)
    while (cursor.getTime() < end) {
      ticks.push({ at: cursor.getTime(), label: cursor.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) })
      cursor.setMonth(cursor.getMonth() + step)
    }
  }
  return ticks
}

export function weekends(range: DateRange): TimeInterval[] {
  const result: TimeInterval[] = []
  const start = range.start.getTime()
  const end = range.end.getTime()
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate())
  const offset = cursor.getDay() === 0 ? -1 : (6 - cursor.getDay() + 7) % 7
  cursor.setDate(cursor.getDate() + offset)
  while (cursor.getTime() < end) {
    const saturday = cursor.getTime()
    const monday = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 2).getTime()
    if (monday > start) result.push({ start: Math.max(start, saturday), end: Math.min(end, monday) })
    cursor.setDate(cursor.getDate() + 7)
  }
  return result
}
