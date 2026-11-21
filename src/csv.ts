import { validateReading, type Reading, type ReadingInput } from './data.ts'

const header = ['Datum', 'Uhrzeit', 'Systolisch (mmHg)', 'Diastolisch (mmHg)', 'Puls (bpm)', 'Kommentar']

function parseRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closedQuote = false
  const content = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
        closedQuote = true
      } else {
        field += character
      }
    } else if (character === '"') {
      if (field || closedQuote) throw new Error('Ungültige Anführungszeichen in der CSV-Datei.')
      quoted = true
    } else if (character === ';') {
      row.push(field)
      field = ''
      closedQuote = false
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && content[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
      field = ''
      closedQuote = false
    } else {
      if (closedQuote) throw new Error('Unerwarteter Text nach einem Anführungszeichen.')
      field += character
    }
  }

  if (quoted) throw new Error('Ein Anführungszeichen in der CSV-Datei ist nicht geschlossen.')
  if (field || row.length || closedQuote) {
    row.push(field)
    if (row.some((cell) => cell !== '')) rows.push(row)
  }
  return rows
}

function validDate(date: string, time: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  const hours = Number(time.slice(0, 2))
  const minutes = Number(time.slice(3, 5))
  const parsed = new Date(year, month - 1, day, hours, minutes)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day && parsed.getHours() === hours && parsed.getMinutes() === minutes
}

function integer(cell: string): number {
  return /^\d+$/.test(cell) ? Number(cell) : Number.NaN
}

export function parseReadingsCsv(text: string): Reading[] {
  const rows = parseRows(text)
  if (!rows.length || rows[0].length !== header.length || rows[0].some((cell, index) => cell !== header[index])) {
    throw new Error('CSV-Spalten stimmen nicht mit dem Blutdruck-Export überein.')
  }
  if (rows.length === 1) throw new Error('Die CSV-Datei enthält keine Messungen.')

  return rows.slice(1).map((row, index) => {
    const record = index + 1
    if (row.length !== header.length) throw new Error(`Datensatz ${record}: erwartet werden sechs Spalten.`)
    if (!validDate(row[0], row[1])) throw new Error(`Datensatz ${record}: Datum oder Uhrzeit ist ungültig.`)
    const comment = row[5].startsWith("'") && /^[\s]*[=+@-]/.test(row[5].slice(1)) ? row[5].slice(1) : row[5]
    if (comment.length > 300) throw new Error(`Datensatz ${record}: der Kommentar ist länger als 300 Zeichen.`)
    const value: ReadingInput = {
      measuredAt: `${row[0]}T${row[1]}`,
      systolic: integer(row[2]),
      diastolic: integer(row[3]),
      pulse: integer(row[4]),
      comment,
    }
    const issue = validateReading(value)
    if (issue) throw new Error(`Datensatz ${record}: ${issue}`)
    return { ...value, id: crypto.randomUUID() }
  })
}
