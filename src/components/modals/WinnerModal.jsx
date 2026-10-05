import { useMemo } from 'react'
import { FaTrophy } from 'react-icons/fa'
import { FiEye, FiRotateCw } from 'react-icons/fi'
import { useGameStore } from '../../store'
import { useToastStore } from '../../hooks/useToast'
import { formatScore, getLeaders, rankPlayers, sumScores } from '../../utils/helpers'
import Avatar from '../Avatar'
import Modal from '../Modal'
import ExportButtons from '../ExportButtons'

export default function WinnerModal({ onClose }) {
  const players = useGameStore((s) => s.players)
  const rounds = useGameStore((s) => s.rounds)
  const totalRounds = useGameStore((s) => s.totalRounds)
  const resetGame = useGameStore((s) => s.resetGame)
  const { success } = useToastStore()

  const totals = useMemo(() => sumScores(rounds, players.length), [rounds, players.length])
  const ranked = rankPlayers(players, totals)
  const winners = getLeaders(totals).map((i) => players[i])
  const isTie = winners.length > 1

  const handleNewGame = () => {
    resetGame()
    success('Ready for a new game.')
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy="winner-title"
      className="my-8 w-full max-w-md rounded-3xl border border-accent/30 bg-surface p-8 text-center shadow-2xl sm:p-10"
      backdropClassName="bg-black/70 backdrop-blur-md"
    >
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 text-gold">
        <FaTrophy className="h-10 w-10" aria-hidden="true" />
      </div>

      <h2 id="winner-title" className="mb-1 text-3xl text-ink">
        {isTie ? 'It’s a tie' : `${winners[0]} wins`}
      </h2>
      <p className="mb-6 text-mute">
        {isTie ? `${winners.join(' and ')} share first place` : 'Game over'} with{' '}
        <span className="font-extrabold text-accent">{formatScore(ranked[0].score)}</span>
      </p>

      <ol className="mb-6 space-y-2 rounded-2xl border border-line bg-raised/50 p-3 text-left">
        {ranked.map((p) => (
          <li key={p.index} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-3 text-ink">
              <span className="w-4 text-center font-extrabold tabular-nums text-mute">{p.rank}</span>
              <Avatar name={p.name} seat={p.index} size="sm" />
              <span className="truncate font-semibold">{p.name}</span>
            </span>
            <span className={`font-extrabold tabular-nums ${p.score >= 0 ? 'text-accent' : 'text-danger'}`}>
              {formatScore(p.score)}
            </span>
          </li>
        ))}
      </ol>

      <ExportButtons players={players} rounds={rounds} totalRounds={totalRounds} className="mb-4 justify-center" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={handleNewGame} className="btn btn-primary flex-1">
          <FiRotateCw className="h-5 w-5" aria-hidden="true" />
          New game
        </button>
        <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
          <FiEye className="h-5 w-5" aria-hidden="true" />
          View scores
        </button>
      </div>
    </Modal>
  )
}
