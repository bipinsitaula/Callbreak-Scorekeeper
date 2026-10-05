import { useMemo } from 'react'
import { useGameStore } from '../store'
import { formatScore, getPlayerStats } from '../utils/helpers'
import { SEAT_COLORS } from './Avatar'

// Same colours as each player's avatar; dashes keep lines distinguishable without colour.
const COLORS = SEAT_COLORS
const DASHES = [undefined, '6 3', '2 3', '8 3 2 3', '1 4']

const W = 600
const H = 260
const PAD = { top: 16, right: 20, bottom: 32, left: 44 }

/** Cumulative score per round, as an SVG line chart. */
function ScoreChart({ players, rounds }) {
  const series = useMemo(
    () =>
      players.map((_, p) => {
        let running = 0
        return [0, ...rounds.map((r) => (running += r.scores[p]))]
      }),
    [players, rounds]
  )

  const all = series.flat()
  const rawMin = Math.min(...all)
  const rawMax = Math.max(...all)
  // Pick a whole-point gridline step that keeps the axis to ~6 lines (values are tenths).
  const span = Math.max(rawMax - rawMin, 10) / 10
  const stepPoints = [1, 2, 5, 10, 20, 50, 100].find((s) => span / s <= 6) ?? 100
  const step = stepPoints * 10
  const min = Math.floor(rawMin / step) * step
  const max = Math.max(Math.ceil(rawMax / step) * step, min + step)
  const x = (i) => PAD.left + (i / Math.max(rounds.length, 1)) * (W - PAD.left - PAD.right)
  const y = (v) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom)

  const yTicks = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + step * i)

  const summary = players
    .map((name, p) => `${name} ${formatScore(series[p][series[p].length - 1])}`)
    .join(', ')

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Cumulative score by round. Current totals: ${summary}`}
        className="h-auto w-full text-mute"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.5 : 0.15} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor">
              {(t / 10).toFixed(0)}
            </text>
          </g>
        ))}
        {Array.from({ length: rounds.length + 1 }, (_, i) => i).map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="currentColor">
            {i === 0 ? '' : `R${i}`}
          </text>
        ))}
        {series.map((values, p) => (
          <g key={p}>
            <polyline
              fill="none"
              stroke={COLORS[p]}
              strokeWidth="2.5"
              strokeDasharray={DASHES[p]}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            />
            {values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 3} fill={COLORS[p]} />
            ))}
          </g>
        ))}
      </svg>

      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
        {players.map((name, p) => (
          <span key={p} className="inline-flex items-center gap-2">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" x2="22" y1="4" y2="4" stroke={COLORS[p]} strokeWidth="3" strokeDasharray={DASHES[p]} />
            </svg>
            {name}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

export default function InsightsPanel() {
  const players = useGameStore((s) => s.players)
  const rounds = useGameStore((s) => s.rounds)
  const stats = useMemo(() => getPlayerStats(players, rounds), [players, rounds])

  if (rounds.length === 0) return null

  return (
    <section className="panel" aria-labelledby="insights-heading">
      <div className="mb-6">
        <h2 id="insights-heading" className="mb-1 text-2xl text-ink">
          Insights
        </h2>
        <p className="text-mute">Score by round, and how well each player bids.</p>
      </div>

      <ScoreChart players={players} rounds={rounds} />

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Bidding statistics per player</caption>
          <thead>
            <tr className="border-b border-line text-xs text-mute">
              <th scope="col" className="px-2 py-2 sm:px-3 text-left font-bold">Player</th>
              <th scope="col" className="px-2 py-2 sm:px-3 text-center font-bold">Bids made</th>
              <th scope="col" className="px-2 py-2 sm:px-3 text-center font-bold">Exact</th>
              <th scope="col" className="px-2 py-2 sm:px-3 text-center font-bold">Avg bid</th>
              <th scope="col" className="px-2 py-2 sm:px-3 text-center font-bold">Overtricks</th>
              <th scope="col" className="px-2 py-2 sm:px-3 text-center font-bold">Best</th>
              <th scope="col" className="px-2 py-2 sm:px-3 text-center font-bold">Worst</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.index} className="border-b border-line/60">
                <th scope="row" className="px-2 py-2 sm:px-3 text-left font-bold text-ink">{s.name}</th>
                <td className="px-2 py-2 sm:px-3 text-center tabular-nums">
                  {s.made}/{s.played} <span className="text-mute">({s.successRate}%)</span>
                </td>
                <td className="px-2 py-2 sm:px-3 text-center tabular-nums">{s.exact}</td>
                <td className="px-2 py-2 sm:px-3 text-center tabular-nums">{s.avgBid.toFixed(1)}</td>
                <td className="px-2 py-2 sm:px-3 text-center tabular-nums">{s.overtricks}</td>
                <td className="px-2 py-2 sm:px-3 text-center tabular-nums text-accent">{formatScore(s.best)}</td>
                <td className="px-2 py-2 sm:px-3 text-center tabular-nums text-danger">{formatScore(s.worst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
