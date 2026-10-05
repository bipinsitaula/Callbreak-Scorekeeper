import { useState } from 'react'
import { useGameStore } from '../store'
import { useToastStore } from '../hooks/useToast'
import { FiArrowLeft, FiArrowRight, FiCheck, FiFlag, FiRotateCcw } from 'react-icons/fi'
import { FaCrown } from 'react-icons/fa'
import BidCard from './BidCard'
import ConfirmDialog from './ConfirmDialog'
import {
  getBidOrder,
  getCardsPerPlayer,
  getDealerIndex,
  getMaxBid,
  isGameComplete,
  sumTricks,
} from '../utils/helpers'

const STEPS = [
  { id: 'bidding', label: 'Bids' },
  { id: 'tricks', label: 'Tricks' },
]

export default function RoundTracker() {
  const players = useGameStore((s) => s.players)
  const playerCount = useGameStore((s) => s.playerCount)
  const currentRound = useGameStore((s) => s.currentRound)
  const totalRounds = useGameStore((s) => s.totalRounds)
  const roundsPlayed = useGameStore((s) => s.rounds.length)
  const dealerStart = useGameStore((s) => s.dealerStart)
  const phase = useGameStore((s) => s.phase)
  const draftBids = useGameStore((s) => s.draftBids)
  const draftTricks = useGameStore((s) => s.draftTricks)
  const { setBid, setTricks, lockBids, unlockBids, submitRound, undoRound, endGameEarly } = useGameStore.getState()
  const setView = useGameStore((s) => s.setView)
  const { error, success } = useToastStore()
  const [confirmAction, setConfirmAction] = useState(null)

  const cards = getCardsPerPlayer(playerCount)
  const maxBid = getMaxBid(playerCount)
  const complete = isGameComplete(currentRound, totalRounds)
  const dealer = getDealerIndex(dealerStart, currentRound, playerCount)
  const order = getBidOrder(dealer, playerCount) // seating starting left of the dealer

  const totalBid = draftBids.reduce((sum, b) => sum + (b ?? 0), 0)
  const bidsOver = totalBid > cards
  const bidsComplete = draftBids.every((b) => b !== null) && !bidsOver
  const assigned = sumTricks(draftTricks)
  const tricksComplete = draftTricks.every((t) => t !== null)
  const tricksValid = tricksComplete && assigned === cards
  const inTricksPhase = phase === 'tricks'
  const progress = Math.min(roundsPlayed / totalRounds, 1) * 100

  const handleLock = () => {
    const result = lockBids()
    if (!result.ok) error(result.error)
  }

  const handleSubmit = () => {
    const round = currentRound
    const result = submitRound()
    if (!result.ok) return error(result.error)
    success(`Round ${round} saved.`)
  }

  const handleUndo = () => {
    if (roundsPlayed === 0) return error('There is no round to undo yet.')
    setConfirmAction({
      title: 'Undo last round?',
      message: `Round ${roundsPlayed} reopens with its bids and tricks so you can correct them.`,
      confirmLabel: 'Undo round',
      onConfirm: () => {
        undoRound()
        setConfirmAction(null)
        success('Round reopened.')
      },
    })
  }

  const handleEndGame = () => {
    if (roundsPlayed === 0) return error('Finish at least one round before ending the game.')
    setConfirmAction({
      title: 'End the game now?',
      message: 'The current standings become the final result.',
      confirmLabel: 'End game',
      onConfirm: () => {
        endGameEarly()
        setConfirmAction(null)
      },
    })
  }

  return (
    <>
      <section className="panel" aria-labelledby="round-heading">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="round-heading" className="mb-1 text-2xl text-ink">
              Round {Math.min(currentRound, totalRounds)} <span className="text-mute">of {totalRounds}</span>
            </h2>
            <p className="text-mute">
              {complete
                ? 'All rounds are done.'
                : inTricksPhase
                  ? 'Enter the tricks each player won.'
                  : 'Enter every player’s bid before play starts.'}
            </p>
          </div>
          {!complete && (
            <ol className="flex items-center gap-2 text-sm font-bold" aria-label="Round steps">
              {STEPS.map((step, i) => {
                const active = step.id === phase
                return (
                  <li key={step.id} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                        active ? 'bg-accent text-accent-ink' : 'bg-raised text-mute'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={active ? 'text-ink' : 'text-mute'}>{step.label}</span>
                    {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden="true" />}
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <div
          role="progressbar"
          aria-label="Game progress"
          aria-valuemin={0}
          aria-valuemax={totalRounds}
          aria-valuenow={roundsPlayed}
          className="mb-6 h-2 overflow-hidden rounded-full bg-raised"
        >
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {complete ? (
          <div className="py-8 text-center">
            <FiFlag className="mx-auto mb-3 h-10 w-10 text-accent" aria-hidden="true" />
            <p className="mb-5 text-mute">Check the final standings, or undo the last round to fix a mistake.</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => setView('leaderboard')} className="btn btn-primary">
                See leaderboard
              </button>
              <button type="button" onClick={handleUndo} className="btn btn-secondary">
                <FiRotateCcw className="h-4 w-4" aria-hidden="true" />
                Undo last round
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 flex items-start gap-2.5 rounded-xl bg-raised/60 px-4 py-3 text-sm text-mute">
              <FaCrown className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" aria-hidden="true" />
              <span>
                <strong className="text-ink">{players[dealer]}</strong> deals.{' '}
                <strong className="text-ink">{players[order[0]]}</strong> bids first and leads the first trick.
              </span>
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {order.map((idx, position) => (
                <BidCard
                  key={idx}
                  playerName={players[idx]}
                  seat={idx}
                  mode={inTricksPhase ? 'tricks' : 'bid'}
                  bid={draftBids[idx]}
                  tricks={draftTricks[idx]}
                  maxBid={maxBid}
                  maxTricks={cards}
                  isDealer={idx === dealer}
                  bidOrder={position + 1}
                  onBidChange={(v) => setBid(idx, v)}
                  onTricksChange={(v) => setTricks(idx, v)}
                />
              ))}
            </div>

            {/* Sticky action bar keeps the primary action in reach; sits above the phone tab bar. */}
            <div className="sticky bottom-[4.25rem] z-20 -mx-5 -mb-5 mt-6 rounded-b-2xl border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mb-7 sm:bottom-0 sm:px-7">
              <div className="mb-3 flex items-center justify-between text-sm" aria-live="polite">
                {inTricksPhase ? (
                  <>
                    <span className="font-semibold text-mute">Tricks assigned</span>
                    <span
                      className={`font-extrabold tabular-nums ${
                        tricksValid ? 'text-accent' : assigned > cards ? 'text-danger' : 'text-ink'
                      }`}
                    >
                      {assigned} / {cards}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-mute">Total bid</span>
                    <span className={`font-extrabold tabular-nums ${bidsOver ? 'text-danger' : 'text-ink'}`}>
                      {totalBid}{' '}
                      <span className="font-medium text-mute">
                        (max {cards}
                        {bidsOver ? ', too high' : ''})
                      </span>
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
                {inTricksPhase ? (
                  <>
                    <button type="button" onClick={handleSubmit} disabled={!tricksValid} className="btn btn-primary col-span-2 sm:flex-1">
                      <FiCheck className="h-5 w-5" aria-hidden="true" />
                      Save round
                    </button>
                    <button type="button" onClick={unlockBids} className="btn btn-secondary">
                      <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Edit bids
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={handleLock} disabled={!bidsComplete} className="btn btn-primary col-span-2 sm:flex-1">
                    Lock bids and play
                    <FiArrowRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={handleUndo} disabled={roundsPlayed === 0} className="btn btn-secondary">
                  <FiRotateCcw className="h-4 w-4" aria-hidden="true" />
                  Undo last
                </button>
                <button type="button" onClick={handleEndGame} disabled={roundsPlayed === 0} className="btn btn-ghost">
                  <FiFlag className="h-4 w-4" aria-hidden="true" />
                  End game
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  )
}
