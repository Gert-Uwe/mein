import { useEffect, useMemo, useState } from 'react'
import Chart from './Chart'
import { currentLocalDateTime, deleteReading, exportCsv, getReadings, saveReading, type Reading } from './data'
import { inRange, localDate, periodOptions, periodRange, rangeLabel, type PeriodKey } from './periods'
import './App.css'

type Input = Omit<Reading, 'id'>
const blank = (): Input => ({ measuredAt: currentLocalDateTime(), systolic: 0, diastolic: 0, pulse: 0, comment: '' })

function validate(value: Input): string | null {
  if (!value.measuredAt || Number.isNaN(new Date(value.measuredAt).getTime())) return 'Bitte Datum und Uhrzeit eingeben.'
  if (!Number.isInteger(value.systolic) || value.systolic < 30 || value.systolic > 300) return 'Systolisch: bitte 30 bis 300 mmHg eingeben.'
  if (!Number.isInteger(value.diastolic) || value.diastolic < 20 || value.diastolic > 250) return 'Diastolisch: bitte 20 bis 250 mmHg eingeben.'
  if (value.diastolic >= value.systolic) return 'Systolisch muss größer als diastolisch sein.'
  if (!Number.isInteger(value.pulse) || value.pulse < 20 || value.pulse > 250) return 'Puls: bitte 20 bis 250 bpm eingeben.'
  return null
}

function PeriodSelect({ label, value, setValue, start, end, setStart, setEnd }: {
  label: string; value: PeriodKey; setValue: (key: PeriodKey) => void
  start: string; end: string; setStart: (date: string) => void; setEnd: (date: string) => void
}) {
  return <div className="period-select">
    <label>{label}<select value={value} onChange={(event) => setValue(event.target.value as PeriodKey)}>{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {value === 'custom' && <div className="custom-dates"><label>Von<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Bis<input type="date" min={start} value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>}
  </div>
}

function InputCells({ value, change }: { value: Input; change: (value: Input) => void }) {
  const number = (key: 'systolic' | 'diastolic' | 'pulse', label: string, min: number, max: number) =>
    <td data-label={label}><input aria-label={label} type="number" inputMode="numeric" min={min} max={max} step="1" required value={value[key] || ''} onChange={(event) => change({ ...value, [key]: event.target.value === '' ? 0 : Number(event.target.value) })} /></td>
  return <>
    <td data-label="Datum & Uhrzeit"><input aria-label="Datum und Uhrzeit" type="datetime-local" required value={value.measuredAt} onChange={(event) => change({ ...value, measuredAt: event.target.value })} /></td>
    {number('systolic', 'Systolisch', 30, 300)}
    {number('diastolic', 'Diastolisch', 20, 250)}
    {number('pulse', 'Puls', 20, 250)}
    <td data-label="Kommentar"><input aria-label="Kommentar" type="text" maxLength={300} placeholder="Optional" value={value.comment} onChange={(event) => change({ ...value, comment: event.target.value })} /></td>
  </>
}

function App() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [draft, setDraft] = useState<Input>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Input | null>(null)
  const [descending, setDescending] = useState(true)
  const [tableStart, setTableStart] = useState('')
  const [tableEnd, setTableEnd] = useState('')
  const [period, setPeriod] = useState<PeriodKey>('this-month')
  const [periodStart, setPeriodStart] = useState(localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [periodEnd, setPeriodEnd] = useState(localDate(new Date()))
  const [compare, setCompare] = useState(false)
  const [comparePeriod, setComparePeriod] = useState<PeriodKey>('last-month')
  const [compareStart, setCompareStart] = useState('')
  const [compareEnd, setCompareEnd] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReadings().then(setReadings).catch(() => setError('Lokale Daten konnten nicht geöffnet werden. Bitte Safari-Speicher prüfen.')).finally(() => setLoading(false))
  }, [])

  const currentRange = periodRange(period, periodStart, periodEnd)
  const comparisonRange = compare ? periodRange(comparePeriod, compareStart, compareEnd) : null
  const current = readings.filter((reading) => inRange(reading.measuredAt, currentRange))
  const comparison = readings.filter((reading) => inRange(reading.measuredAt, comparisonRange))
  const shown = useMemo(() => readings.filter((reading) => (!tableStart || reading.measuredAt.slice(0, 10) >= tableStart) && (!tableEnd || reading.measuredAt.slice(0, 10) <= tableEnd)).sort((a, b) => descending ? b.measuredAt.localeCompare(a.measuredAt) : a.measuredAt.localeCompare(b.measuredAt)), [readings, tableStart, tableEnd, descending])
  const mean = (key: 'systolic' | 'diastolic' | 'pulse') => current.length ? Math.round(current.reduce((sum, reading) => sum + reading[key], 0) / current.length) : '–'

  async function add() {
    const issue = validate(draft)
    if (issue) { setError(issue); setMessage(''); return }
    const reading = { ...draft, comment: draft.comment.trim(), id: crypto.randomUUID() }
    try {
      await saveReading(reading)
      setReadings((items) => [reading, ...items])
      setDraft(blank())
      setDescending(true)
      setTableStart('')
      setTableEnd('')
      setError('')
      setMessage('Messung gespeichert.')
    } catch { setError('Speichern fehlgeschlagen. Bitte freien Speicherplatz prüfen.') }
  }

  async function saveEdit() {
    if (!editing || !editingId) return
    const issue = validate(editing)
    if (issue) { setError(issue); setMessage(''); return }
    const reading = { ...editing, comment: editing.comment.trim(), id: editingId }
    try {
      await saveReading(reading)
      setReadings((items) => items.map((item) => item.id === editingId ? reading : item))
      setEditingId(null)
      setEditing(null)
      setError('')
      setMessage('Messung aktualisiert.')
    } catch { setError('Änderung konnte nicht gespeichert werden.') }
  }

  async function remove(id: string) {
    if (!window.confirm('Diese Messung wirklich löschen?')) return
    try {
      await deleteReading(id)
      setReadings((items) => items.filter((item) => item.id !== id))
      setError('')
      setMessage('Messung gelöscht.')
    } catch { setError('Messung konnte nicht gelöscht werden.') }
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark" aria-hidden="true">♥</span><span>Blutdruck<span className="brand-light">Tagebuch</span></span></div><span className="local-badge">● Nur auf diesem Gerät</span></header>
    <main>
      <div className="page-heading"><div><p className="eyebrow">Dein Gesundheitsprotokoll</p><h1>Blutdruck im Blick.</h1><p className="subtitle">Messungen festhalten, Zeiträume vergleichen und deine Werte als CSV sichern.</p></div><a className="heading-link" href="#messungen">Messung erfassen</a></div>
      {(error || message) && <div className={error ? 'notice notice-error' : 'notice notice-success'} role="status">{error || message}</div>}

      <section className="panel dashboard" aria-labelledby="dashboard-heading">
        <div className="section-heading"><div><p className="eyebrow">Analyse</p><h2 id="dashboard-heading">Verlauf</h2></div><span className="section-note">{rangeLabel(currentRange)}</span></div>
        <div className="controls-row">
          <PeriodSelect label="Zeitraum" value={period} setValue={setPeriod} start={periodStart} end={periodEnd} setStart={setPeriodStart} setEnd={setPeriodEnd} />
          <label className="compare-toggle"><input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} /><span>Mit anderem Zeitraum vergleichen</span></label>
          {compare && <PeriodSelect label="Vergleichszeitraum" value={comparePeriod} setValue={setComparePeriod} start={compareStart} end={compareEnd} setStart={setCompareStart} setEnd={setCompareEnd} />}
        </div>
        {compare && <p className="comparison-info">Aktuell: {rangeLabel(currentRange)} · Vergleich: {rangeLabel(comparisonRange)}</p>}
        <div className="stats-grid"><div className="stat"><span>Messungen</span><strong>{current.length}</strong><small>im gewählten Zeitraum</small></div><div className="stat"><span>Ø Systolisch</span><strong className="blue-text">{mean('systolic')} <small>mmHg</small></strong></div><div className="stat"><span>Ø Diastolisch</span><strong className="red-text">{mean('diastolic')} <small>mmHg</small></strong></div><div className="stat"><span>Ø Puls</span><strong>{mean('pulse')} <small>bpm</small></strong></div></div>
        <div className="chart-legend"><span><i className="legend-dot blue-dot" /> Systolisch</span><span><i className="legend-dot red-dot" /> Diastolisch</span>{compare && <span><i className="legend-dash" /> Vergleichszeitraum</span>}</div>
        {currentRange && (!compare || comparisonRange) ? <Chart current={{ readings: current, range: currentRange }} previous={compare && comparisonRange ? { readings: comparison, range: comparisonRange, comparison: true } : undefined} /> : <div className="chart-empty">Bitte einen gültigen Zeitraum auswählen.</div>}
      </section>

      <section className="panel readings-panel" id="messungen" aria-labelledby="readings-heading">
        <div className="section-heading"><div><p className="eyebrow">Protokoll</p><h2 id="readings-heading">Messungen</h2></div><button className="secondary-button" type="button" onClick={() => exportCsv(readings)} disabled={readings.length === 0}>CSV exportieren</button></div>
        <div className="table-tools"><label>Von<input type="date" value={tableStart} onChange={(event) => setTableStart(event.target.value)} /></label><label>Bis<input type="date" value={tableEnd} min={tableStart} onChange={(event) => setTableEnd(event.target.value)} /></label><button className="text-button" type="button" onClick={() => { setTableStart(''); setTableEnd('') }}>Filter zurücksetzen</button><span className="result-count">{shown.length} von {readings.length} Einträgen</span></div>
        <div className="table-scroll"><table>
          <thead><tr><th><button className="sort-button" type="button" onClick={() => setDescending((value) => !value)} aria-label={`Nach Datum und Uhrzeit sortieren, aktuell ${descending ? 'neueste zuerst' : 'älteste zuerst'}`}>Datum & Uhrzeit <span aria-hidden="true">{descending ? '↓' : '↑'}</span></button></th><th>Systolisch <span className="unit">mmHg</span></th><th>Diastolisch <span className="unit">mmHg</span></th><th>Puls <span className="unit">bpm</span></th><th>Kommentar</th><th>Aktion</th></tr></thead>
          <tbody>
            <tr className="entry-row"><InputCells value={draft} change={setDraft} /><td data-label="Aktion"><button className="primary-button" type="button" onClick={add} disabled={loading}>Speichern</button></td></tr>
            {shown.map((reading) => <tr key={reading.id} className={editingId === reading.id ? 'editing-row' : ''}>
              {editingId === reading.id && editing ? <InputCells value={editing} change={setEditing} /> : <><td data-label="Datum & Uhrzeit" className="date-cell">{new Date(reading.measuredAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</td><td data-label="Systolisch"><span className="value blue-text">{reading.systolic}</span></td><td data-label="Diastolisch"><span className="value red-text">{reading.diastolic}</span></td><td data-label="Puls"><span className="value">{reading.pulse}</span></td><td data-label="Kommentar" className="comment-cell">{reading.comment || <span className="muted">–</span>}</td></>}
              <td data-label="Aktion"><div className="row-actions">{editingId === reading.id ? <><button className="small-button" type="button" onClick={saveEdit}>Sichern</button><button className="text-button" type="button" onClick={() => { setEditingId(null); setEditing(null); setError('') }}>Abbrechen</button></> : <><button className="text-button" type="button" onClick={() => { setEditingId(reading.id); setEditing({ measuredAt: reading.measuredAt, systolic: reading.systolic, diastolic: reading.diastolic, pulse: reading.pulse, comment: reading.comment }); setError(''); setMessage('') }}>Bearbeiten</button><button className="text-button danger" type="button" onClick={() => remove(reading.id)}>Löschen</button></>}</div></td>
            </tr>)}
          </tbody>
        </table></div>
        {!loading && readings.length === 0 && <p className="empty-note">Noch keine Messungen vorhanden. Trage deinen ersten Wert in der obersten Tabellenzeile ein.</p>}
        {!loading && readings.length > 0 && shown.length === 0 && <p className="empty-note">Keine Messungen im gewählten Datumsbereich.</p>}
      </section>
      <p className="privacy-note">Deine Messungen bleiben lokal in diesem Browser. Exportiere regelmäßig eine CSV-Sicherung. Zur Installation auf dem iPhone: in Safari „Teilen“ → „Zum Home-Bildschirm“.</p>
    </main>
  </div>
}

export default App
