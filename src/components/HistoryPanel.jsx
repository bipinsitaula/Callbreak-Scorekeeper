import { useState } from 'react'
import { FiChevronDown, FiDownload, FiTrash2 } from 'react-icons/fi'
import { useGameStore } from '../store'
import { downloadCsv } from '../utils/export'
import { formatScore, getLeaders, rankPlayers, sumScores } from '../utils/helpers'
import ConfirmDialog from './ConfirmDialog'

const formatDate = (ts) =>
  new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Round-by-round detail for one finished game. */
function GameDetails({ game, totals }) {
  return (
    <div className="overflow-x-auto border-t border-line px-4 pb-4 pt-3">
      <table className="w-full text-sm">
        <caption className="sr-only">Scores for each round</caption>
        <thead>
          <tr className="text-xs text-mute">
            <th scope="col" className="px-2 py-2 text-left font-bold">Round</th>
            {game.players.map((name, i) => (
              <th key={i} scope="col" className="px-2 py-2 text-center font-bold">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {game.rounds.map((round, r) => (
            <tr key={r} className="border-t border-line/60">
              <th scope="row" className="px-2 py-2 text-left font-bold text-ink">{r + 1}</th>
              {round.scores.map((score, p) => (
                <td key={p} className="px-2 py-2 text-center">
                  <div className={`font-extrabold tabular-nums ${score >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {formatScore(score)}
                  </div>
                  <div className="text-xs tabular-nums text-mute">
                    {round.bids[p]} / {round.tricks[p]}
                  </div>
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="px-2 py-2 text-left font-extrabold text-ink">Total</th>
            {totals.map((t, i) => (
              <td key={i} className="px-2 py-2 text-center font-extrabold tabular-nums text-ink">{formatScore(t)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Finished games, newest first. Games are archived automatically when they complete. */
export default function HistoryPanel() {
  const history = useGameStore((s) => s.history)
  const deleteHistoryEntry = useGameStore((s) => s.deleteHistoryEntry)
  const clearHistory = useGameStore((s) => s.clearHistory)
  const [openId, setOpenId] = useState(null)
  const [confirm, setConfirm] = useState(null) // { id } for one game, or { all: true }

  if (history.length === 0) return null

  const target = confirm?.id ? history.find((g) => g.id === confirm.id) : null

  return (
    <section className="panel" aria-labelledby="history-title">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="history-title" className="text-2xl text-ink">Past games</h2>
        <button type="button" onClick={() => setConfirm({ all: true })} className="btn btn-ghost !min-h-0 !px-2 !py-1.5">
          Clear all
        </button>
      </div>

      <ul className="space-y-3">
        {history.map((game) => {
          const totals = sumScores(game.rounds, game.players.length)
          const ranked = rankPlayers(game.players, totals)
          const winners = getLeaders(totals).map((i) => game.players[i])
          const open = openId === game.id
          const panelId = `game-details-${game.id}`
          return (
            <li key={game.id} className="rounded-2xl border border-line bg-raised/40">
              <div className="flex items-center gap-1 p-2 pr-3">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : game.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-2 text-left"
                >
                  <FiChevronDown
                    aria-hidden="true"
                    className={`mt-1 h-5 w-5 flex-shrink-0 text-mute transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">
                      {winners.length > 1 ? `Tie: ${winners.join(' & ')}` : `${winners[0]} won`}
                    </span>
                    <span className="block text-xs text-mute">
                      {formatDate(game.finishedAt)}, {game.rounds.length} of {game.totalRounds} rounds
                    </span>
                    <span className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums text-mute">
                      {ranked.map((p) => (
                        <span key={p.index}>
                          {p.name} <span className="font-bold text-ink">{formatScore(p.score)}</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Download CSV for game on ${formatDate(game.finishedAt)}`}
                    onClick={() => downloadCsv(game.players, game.rounds, `call-break-${game.id}.csv`)}
                    className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink"
                  >
                    <FiDownload className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete game on ${formatDate(game.finishedAt)}`}
                    onClick={() => setConfirm({ id: game.id })}
                    className="rounded-lg p-2 text-mute hover:bg-raised hover:text-danger"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {open && (
                <div id={panelId}>
                  <GameDetails game={game} totals={totals} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {confirm?.all && (
        <ConfirmDialog
          title="Clear all past games?"
          message="Every saved game is removed from this device. This can't be undone."
          confirmLabel="Clear all"
          onConfirm={() => {
            clearHistory()
            setConfirm(null)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {target && (
        <ConfirmDialog
          title="Delete this game?"
          message={`The game from ${formatDate(target.finishedAt)} is removed from this device. This can't be undone.`}
          confirmLabel="Delete game"
          onConfirm={() => {
            deleteHistoryEntry(target.id)
            if (openId === target.id) setOpenId(null)
            setConfirm(null)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  )
}
