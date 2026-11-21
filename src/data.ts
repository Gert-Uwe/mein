export type Reading = {
  id: string
  measuredAt: string
  systolic: number
  diastolic: number
  pulse: number
  comment: string
}

export type ReadingInput = Omit<Reading, 'id'>

export function validateReading(value: ReadingInput): string | null {
  if (!value.measuredAt || Number.isNaN(new Date(value.measuredAt).getTime())) return 'Bitte Datum und Uhrzeit eingeben.'
  if (!Number.isInteger(value.systolic) || value.systolic < 30 || value.systolic > 300) return 'Systolisch: bitte 30 bis 300 mmHg eingeben.'
  if (!Number.isInteger(value.diastolic) || value.diastolic < 20 || value.diastolic > 250) return 'Diastolisch: bitte 20 bis 250 mmHg eingeben.'
  if (value.diastolic >= value.systolic) return 'Systolisch muss größer als diastolisch sein.'
  if (!Number.isInteger(value.pulse) || value.pulse < 20 || value.pulse > 250) return 'Puls: bitte 20 bis 250 bpm eingeben.'
  return null
}

const databaseName = 'blutdruck-tagebuch'
const storeName = 'readings'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, setResult: (value: T) => void) => void,
): Promise<T> {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    let result: T
    transaction.oncomplete = () => {
      database.close()
      resolve(result)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error)
    }
    try {
      operation(store, (value) => { result = value })
    } catch (error) {
      transaction.abort()
      reject(error)
    }
  })
}

export function getReadings(): Promise<Reading[]> {
  return withStore('readonly', (store, setResult) => {
    const request = store.getAll()
    request.onsuccess = () => setResult(request.result as Reading[])
  })
}

export function saveReading(reading: Reading): Promise<void> {
  return withStore('readwrite', (store) => {
    store.put(reading)
  })
}

export function deleteReading(id: string): Promise<void> {
  return withStore('readwrite', (store) => {
    store.delete(id)
  })
}

export function replaceReadings(readings: Reading[]): Promise<void> {
  return withStore('readwrite', (store) => {
    store.clear()
    for (const reading of readings) store.add(reading)
  })
}

export function currentLocalDateTime(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function csvCell(value: string | number): string {
  let text = String(value)
  // Prevent spreadsheet applications from interpreting comments as formulas.
  if (/^[\s]*[=+@-]/.test(text) && typeof value === 'string') text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function exportCsv(readings: Reading[]): void {
  const rows = [
    ['Datum', 'Uhrzeit', 'Systolisch (mmHg)', 'Diastolisch (mmHg)', 'Puls (bpm)', 'Kommentar'],
    ...[...readings]
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
      .map((reading) => [
        reading.measuredAt.slice(0, 10),
        reading.measuredAt.slice(11, 16),
        reading.systolic,
        reading.diastolic,
        reading.pulse,
        reading.comment,
      ]),
  ]
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `blutdruck-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
