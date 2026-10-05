import { useMemo, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import { useGameStore } from '../store'
import { formatScore, getLeaders, sumScores } from '../utils/helpers'
import EditRoundModal from './modals/EditRoundModal'

export default function ScoreHistory() {
  const players = useGameStore((s) => s.players)
  const rounds = useGameStore((s) => s.rounds)
  const [editingRound, setEditingRound] = useState(null)

  const totals = useMemo(() => sumScores(rounds, players.length), [rounds, players.length])
  const leaders = getLeaders(totals)

  if (rounds.length === 0) return null

  return (
    <>
      <section className="panel" aria-labelledby="history-heading">
        <div className="mb-6">
          <h2 id="history-heading" className="mb-1 text-2xl text-ink">Round by round</h2>
          <p className="text-mute">Select a round to edit it. Each cell shows the score, then bid / tricks won.</p>
        </div>

        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-mute">
                <th scope="col" className="px-3 py-3 text-left font-bold">Round</th>
                {players.map((name, i) => (
                  <th key={i} scope="col" className={`px-3 py-3 text-center font-bold ${leaders.includes(i) ? 'text-accent' : ''}`}>
                    {name}
                    {leaders.includes(i) && <span className="sr-only"> (leading)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, roundIdx) => (
                <tr key={roundIdx} className="border-b border-line/60 transition-colors hover:bg-raised/40">
                  <th scope="row" className="px-3 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => setEditingRound(roundIdx)}
                      className="inline-flex items-center gap-1.5 rounded-md font-bold text-accent hover:underline"
                    >
                      {roundIdx + 1}
                      <FiEdit2 className="h-3.5 w-3.5" aria-label="Edit round" />
                    </button>
                  </th>
                  {round.scores.map((score, playerIdx) => (
                    <td key={playerIdx} className="px-3 py-3 text-center">
                      <div className={`font-extrabold tabular-nums ${score >= 0 ? 'text-accent' : 'text-danger'}`}>
                        {formatScore(score)}
                      </div>
                      <div className="text-xs tabular-nums text-mute">
                        {round.bids[playerIdx]} / {round.tricks[playerIdx]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}

              <tr className="bg-accent/10">
                <th scope="row" className="rounded-l-xl px-3 py-3 text-left font-extrabold text-ink">Total</th>
                {totals.map((total, i) => (
                  <td
                    key={i}
                    className={`px-3 py-3 text-center text-lg font-extrabold tabular-nums text-ink ${
                      i === totals.length - 1 ? 'rounded-r-xl' : ''
                    }`}
                  >
                    {formatScore(total)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {editingRound !== null && <EditRoundModal roundIndex={editingRound} onClose={() => setEditingRound(null)} />}
    </>
  )
}
