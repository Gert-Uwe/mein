import type { Reading } from './data'
import type { DateRange } from './periods'
import { rangeLabel } from './periods'

type Series = { readings: Reading[]; range: DateRange; comparison?: boolean }

const width = 860
const height = 320
const plot = { left: 56, top: 26, right: 20, bottom: 45 }
const plotWidth = width - plot.left - plot.right
const plotHeight = height - plot.top - plot.bottom

function timestamp(reading: Reading): number {
  return new Date(reading.measuredAt).getTime()
}

export default function Chart({ current, previous }: { current: Series; previous?: Series }) {
  const all = [...current.readings, ...(previous?.readings ?? [])]
  if (all.length === 0) {
    return <div className="chart-empty">Für diese Zeiträume sind noch keine Messungen vorhanden.</div>
  }

  const values = all.flatMap((reading) => [reading.systolic, reading.diastolic])
  const minimum = Math.max(0, Math.floor((Math.min(...values) - 15) / 20) * 20)
  const maximum = Math.ceil((Math.max(...values) + 15) / 20) * 20
  const scaleY = (value: number) => plot.top + ((maximum - value) / (maximum - minimum)) * plotHeight
  const scaleX = (reading: Reading, range: DateRange) => {
    const duration = range.end.getTime() - range.start.getTime()
    return plot.left + ((timestamp(reading) - range.start.getTime()) / duration) * plotWidth
  }
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
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = minimum + ((maximum - minimum) * tick) / 4
          const y = scaleY(value)
          return <g key={tick}><line className="chart-grid" x1={plot.left} x2={width - plot.right} y1={y} y2={y} /><text className="chart-axis-label" x={plot.left - 10} y={y + 4} textAnchor="end">{Math.round(value)}</text></g>
        })}
        <text className="chart-axis-title" x={plot.left} y="14">mmHg</text>
        {renderSeries(current)}
        {previous && renderSeries(previous)}
        <text className="chart-axis-label" x={plot.left} y={height - 12}>Beginn</text>
        <text className="chart-axis-label" x={width - plot.right} y={height - 12} textAnchor="end">Ende</text>
      </svg>
      <p className="chart-caption">Zeiträume sind für den Vergleich auf dieselbe Breite gelegt. Punkte zeigen einzelne Messungen; die schwarze Linie verbindet jeweils Systole und Diastole.</p>
    </div>
  )
}
