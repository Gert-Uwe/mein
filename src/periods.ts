export type PeriodKey =
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'six-months'
  | 'this-year'
  | 'last-year'
  | 'custom'

export type DateRange = { start: Date; end: Date }
export type TimeOfDay = 'all' | 'morning' | 'midday' | 'evening'

export const periodOptions: { value: PeriodKey; label: string }[] = [
  { value: 'this-week', label: 'Aktuelle Woche' },
  { value: 'last-week', label: 'Letzte Woche' },
  { value: 'this-month', label: 'Aktueller Monat' },
  { value: 'last-month', label: 'Letzter Monat' },
  { value: 'six-months', label: 'Letzte 6 Monate' },
  { value: 'this-year', label: 'Aktuelles Jahr' },
  { value: 'last-year', label: 'Letztes Jahr' },
  { value: 'custom', label: 'Eigener Zeitraum' },
]

export function localDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function periodRange(key: PeriodKey, customStart: string, customEnd: string, now = new Date()): DateRange | null {
  if (key === 'custom') {
    if (!customStart || !customEnd || customStart > customEnd) return null
    return {
      start: new Date(`${customStart}T00:00:00`),
      end: new Date(Number(customEnd.slice(0, 4)), Number(customEnd.slice(5, 7)) - 1, Number(customEnd.slice(8, 10)) + 1),
    }
  }

  const year = now.getFullYear()
  const month = now.getMonth()
  const today = new Date(year, month, now.getDate())
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  switch (key) {
    case 'this-week': return { start: monday, end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7) }
    case 'last-week': return { start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7), end: monday }
    case 'this-month': return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) }
    case 'last-month': return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) }
    case 'six-months': return { start: new Date(year, month - 5, 1), end: new Date(year, month + 1, 1) }
    case 'this-year': return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) }
    case 'last-year': return { start: new Date(year - 1, 0, 1), end: new Date(year, 0, 1) }
  }
}

export function inRange(measuredAt: string, range: DateRange | null): boolean {
  if (!range) return false
  const timestamp = new Date(measuredAt).getTime()
  return timestamp >= range.start.getTime() && timestamp < range.end.getTime()
}

export function inTimeOfDay(measuredAt: string, timeOfDay: TimeOfDay): boolean {
  if (timeOfDay === 'all') return true
  const hour = Number(measuredAt.slice(11, 13))
  if (timeOfDay === 'morning') return hour < 10
  if (timeOfDay === 'midday') return hour >= 10 && hour < 16
  return hour >= 16
}

export function rangeLabel(range: DateRange | null): string {
  if (!range) return 'Bitte gültige Daten auswählen'
  const end = new Date(range.end.getTime() - 1)
  return `${range.start.toLocaleDateString('de-DE')} – ${end.toLocaleDateString('de-DE')}`
}
