import type { Reading } from './data'
import type { DateRange } from './periods'
import { rangeLabel } from './periods'
import { axisTicks, weekends } from './chartScale'

type Series = { readings: Reading[]; range: DateRange; comparison?: boolean }

const width = 860
const height = 350

function timestamp(reading: Reading): number {
  return new Date(reading.measuredAt).getTime()
}

export default function Chart({ current, previous }: { current: Series; previous?: Series }) {
  const all = [...current.readings, ...(previous?.readings ?? [])]
  const plot = { left: 56, top: previous ? 70 : 30, right: 26, bottom: 62 }
  const plotWidth = width - plot.left - plot.right
  const plotHeight = height - plot.top - plot.bottom
  const scaleTime = (time: number, range: DateRange) => plot.left + ((time - range.start.getTime()) / (range.end.getTime() - range.start.getTime())) * plotWidth

  const values = all.length ? all.flatMap((reading) => [reading.systolic, reading.diastolic]) : [40, 180]
  const minimum = Math.max(0, Math.floor((Math.min(...values) - 15) / 20) * 20)
  const maximum = Math.ceil((Math.max(...values) + 15) / 20) * 20
  const scaleY = (value: number) => plot.top + ((maximum - value) / (maximum - minimum)) * plotHeight
  const scaleX = (reading: Reading, range: DateRange) => scaleTime(timestamp(reading), range)
  const linePath = (series: Series, key: 'systolic' | 'diastolic') =>
    [...series.readings]
      .sort((a, b) => timestamp(a) - timestamp(b))
      .map((reading, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(reading, series.range)} ${scaleY(reading[key])}`)
      .join(' ')

  const renderSeries = (series: Series) => (
    <g className={series.comparison ? 'chart-comparison' : 'chart-current'}>
      <path className="chart-line chart-systolic-line" d={linePath(series, 'systolic')} />
      <path className="chart-line chart-diastolic-line" d={linePath(series, 'diastolic')} />
      {series.readings.map((reading) => {
        const x = scaleX(reading, series.range)
        const label = `${new Date(reading.measuredAt).toLocaleString('de-DE')}: ${reading.systolic}/${reading.diastolic} mmHg, Puls ${reading.pulse}`
        return (
          <g key={`${series.comparison ? 'comparison' : 'current'}-${reading.id}`}>
            <line className="chart-pair-line" x1={x} x2={x} y1={scaleY(reading.systolic)} y2={scaleY(reading.diastolic)} />
            <circle className="chart-point chart-systolic" cx={x} cy={scaleY(reading.systolic)} r="5">
              <title>{label}</title>
            </circle>
            <circle className="chart-point chart-diastolic" cx={x} cy={scaleY(reading.diastolic)} r="5">
              <title>{label}</title>
            </circle>
          </g>
        )
      })}
    </g>
  )

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Blutdruckverlauf ${rangeLabel(current.range)}${previous ? `, verglichen mit ${rangeLabel(previous.range)}` : ''}`}>
        {weekends(current.range).map((weekend) => <rect key={weekend.start} className="chart-weekend" x={scaleTime(weekend.start, current.range)} y={plot.top} width={scaleTime(weekend.end, current.range) - scaleTime(weekend.start, current.range)} height={plotHeight} />)}
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = minimum + ((maximum - minimum) * tick) / 4
          const y = scaleY(value)
          return <g key={tick}><line className="chart-grid" x1={plot.left} x2={width - plot.right} y1={y} y2={y} /><text className="chart-axis-label" x={plot.left - 10} y={y + 4} textAnchor="end">{Math.round(value)}</text></g>
        })}
        {axisTicks(current.range).map((tick) => {
          const x = scaleTime(tick.at, current.range)
          return <g key={tick.at}><line className="chart-time-grid" x1={x} x2={x} y1={plot.top} y2={height - plot.bottom} /><text className="chart-axis-label" x={x} y={height - 31} textAnchor="middle">{tick.label}</text></g>
        })}
        {previous && <>
          <text className="chart-axis-title" x={plot.left} y="17">Vergleichszeitraum</text>
          {axisTicks(previous.range).map((tick) => {
            const x = scaleTime(tick.at, previous.range)
            return <g key={tick.at}><line className="chart-axis-tick" x1={x} x2={x} y1={plot.top - 7} y2={plot.top} /><text className="chart-axis-label" x={x} y={plot.top - 14} textAnchor="middle">{tick.label}</text></g>
          })}
        </>}
        <text className="chart-axis-title" x={previous ? 7 : plot.left} y={previous ? plot.top - 14 : 16}>mmHg</text>
        {renderSeries(current)}
        {previous && renderSeries(previous)}
        {all.length === 0 && <text className="chart-empty-label" x={plot.left + plotWidth / 2} y={plot.top + plotHeight / 2} textAnchor="middle">Keine Messungen für diese Auswahl</text>}
        <text className="chart-axis-title" x={plot.left} y={height - 9}>Aktueller Zeitraum · Datum / Uhrzeit</text>
      </svg>
      <p className="chart-caption">Zeiträume sind für den Vergleich auf dieselbe Breite gelegt. Graue Flächen markieren Wochenenden im aktuellen Zeitraum. Punkte zeigen einzelne Messungen; die schwarze Linie verbindet jeweils Systole und Diastole.</p>
    </div>
  )
}
