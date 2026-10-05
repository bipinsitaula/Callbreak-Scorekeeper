import { useEffect } from 'react'
import { FaTrophy } from 'react-icons/fa'
import { useGameStore } from '../store'
import { isGameComplete } from '../utils/helpers'
import WinnerModal from './modals/WinnerModal'

const useComplete = () =>
  useGameStore((s) => s.started && s.rounds.length > 0 && isGameComplete(s.currentRound, s.totalRounds))

/** Opens the results dialog whenever a game finishes (also after undo + resubmit). */
export function GameOverModal() {
  const complete = useComplete()
  const resultsOpen = useGameStore((s) => s.resultsOpen)
  const setResultsOpen = useGameStore((s) => s.setResultsOpen)

  useEffect(() => {
    if (complete) setResultsOpen(true)
  }, [complete, setResultsOpen])

  return complete && resultsOpen ? <WinnerModal onClose={() => setResultsOpen(false)} /> : null
}

/** Shown on Play/Leaderboard once the game is over and the dialog was closed. */
export function ResultsBanner() {
  const complete = useComplete()
  const resultsOpen = useGameStore((s) => s.resultsOpen)
  const setResultsOpen = useGameStore((s) => s.setResultsOpen)

  if (!complete || resultsOpen) return null
  return (
    <div className="panel flex flex-col items-center justify-between gap-3 !py-4 sm:flex-row">
      <p className="font-bold text-ink">The game is over.</p>
      <button type="button" className="btn btn-primary" onClick={() => setResultsOpen(true)}>
        <FaTrophy className="h-4 w-4" aria-hidden="true" />
        Show results
      </button>
    </div>
  )
}
