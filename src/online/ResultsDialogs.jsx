import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaTrophy } from 'react-icons/fa'
import { FiChevronDown, FiHome, FiRotateCcw, FiX } from 'react-icons/fi'
import Avatar, { SEAT_COLORS } from '../components/Avatar'
import Modal from '../components/Modal'
import { formatScore, getLeaders, rankPlayers, sumScores } from '../utils/helpers'
import { roundWinner } from './engine'

const MEDAL = ['bg-gold text-slate-900', 'bg-slate-300 text-slate-900', 'bg-amber-700 text-white']

const nameOf = (state, seat, mySeat) => (seat === mySeat ? 'You' : state.players[seat]?.name)

/** Rounds × players table with totals. */
export function ScoreTable({ state, mySeat }) {
  const totals = sumScores(state.rounds, state.players.length)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <thead>
          <tr>
            <th className="pb-2 text-left text-xs font-bold text-mute">Round</th>
            {state.players.map((p, i) => (
              <th key={p.id} className="pb-2 text-right text-xs font-bold text-ink">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar name={p.name} seat={i} size="sm" />
                  <span className="max-w-[5rem] truncate">{nameOf(state, i, mySeat)}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.rounds.map((round, r) => (
            <tr key={r} className="border-t border-line">
              <td className="py-2 font-bold text-mute">{r + 1}</td>
              {round.scores.map((score, i) => (
                <td key={i} className="py-2 text-right tabular-nums">
                  <span className={`font-bold ${score < 0 ? 'text-danger' : 'text-ink'}`}>{formatScore(score)}</span>
                  <span className="block text-[11px] text-mute">
                    {round.tricks[i]}/{round.bids[i]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-line">
            <td className="pt-2 font-extrabold text-ink">Total</td>
            {totals.map((t, i) => (
              <td key={i} className="pt-2 text-right font-extrabold tabular-nums text-accent">
                {formatScore(t)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/** The score sheet under the table: collapsed at first, opens like a drop-down. */
export function ScoreSheet({ state, mySeat }) {
  const [open, setOpen] = useState(false)
  const played = state.rounds.length
  const totals = sumScores(state.rounds, state.players.length)
  const leaders = getLeaders(totals)

  const summary = played
    ? `${played} of ${state.totalRounds} round${state.totalRounds > 1 ? 's' : ''} played · ${
        leaders.length > 1 ? 'Tied for the lead' : `${nameOf(state, leaders[0], mySeat)} ${leaders[0] === mySeat ? 'lead' : 'leads'} with ${formatScore(totals[leaders[0]])}`
      }`
    : 'Scores appear after the first round'

  return (
    <section className="panel !p-0" aria-labelledby="score-sheet-title">
      <h2 id="score-sheet-title">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="score-sheet-body"
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left sm:px-6"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-lg text-ink">Score sheet</span>
            <span className="block truncate text-sm font-semibold text-mute">{summary}</span>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex-shrink-0 text-mute">
            <FiChevronDown className="h-5 w-5" aria-hidden="true" />
          </motion.span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="score-sheet-body"
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
              {played ? (
                <ScoreTable state={state} mySeat={mySeat} />
              ) : (
                <p className="py-2 text-sm text-mute">No rounds finished yet. Each round’s bids, tricks and points will be listed here.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function CloseButton({ onClose, label }) {
  return (
    <button type="button" onClick={onClose} aria-label={label} className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink">
      <FiX className="h-5 w-5" />
    </button>
  )
}

/** After each round: this round's result and the standings so far. */
export function RoundScoresDialog({ state, mySeat, onClose, onNext }) {
  const last = state.rounds[state.rounds.length - 1]
  const totals = sumScores(state.rounds, state.players.length)
  const names = state.players.map((p) => p.name)
  const standings = rankPlayers(names, totals)
  const winner = roundWinner(state)

  return (
    <Modal onClose={onClose} labelledBy="round-scores-title" className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            Round {state.round} of {state.totalRounds} complete
          </p>
          <h2 id="round-scores-title" className="text-xl text-ink">
            Scores so far
          </h2>
        </div>
        <CloseButton onClose={onClose} label="Close scores" />
      </div>

      {winner !== null && (
        <p className="mb-4 flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm text-ink">
          <FaTrophy className="h-4 w-4 flex-shrink-0 text-gold" aria-hidden="true" />
          <span>
            <strong>{winner === mySeat ? 'You' : names[winner]}</strong> won the round with {formatScore(last.scores[winner])}
            {winner === mySeat ? ' and bid first next round.' : ' and bids first next round.'}
          </span>
        </p>
      )}

      <ol className="space-y-2">
        {standings.map(({ index, rank }, i) => {
          const score = last.scores[index]
          return (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${index === mySeat ? 'bg-accent/10 ring-1 ring-accent/40' : 'bg-raised/60'}`}
            >
              <span className="w-5 text-center text-sm font-extrabold text-mute">{rank}</span>
              <Avatar name={names[index]} seat={index} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">{nameOf(state, index, mySeat)}</span>
                <span className="block text-xs text-mute">
                  Bid {last.bids[index]}, won {last.tricks[index]}
                </span>
              </span>
              <span className={`text-sm font-bold tabular-nums ${score < 0 ? 'text-danger' : 'text-accent'}`}>{formatScore(score)}</span>
              <span className="w-14 text-right text-lg font-extrabold tabular-nums text-ink">{formatScore(totals[index])}</span>
            </motion.li>
          )
        })}
      </ol>

      {state.rounds.length > 1 && (
        <details className="mt-4 rounded-xl border border-line px-3 py-2">
          <summary className="cursor-pointer text-sm font-bold text-mute">Score by round</summary>
          <div className="mt-3">
            <ScoreTable state={state} mySeat={mySeat} />
          </div>
        </details>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn btn-primary flex-1" onClick={onNext}>
          Deal round {state.round + 1}
        </button>
        <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}

/** Falling confetti in the seat colours. Positions are fixed per piece so it looks the same on every screen. */
function Confetti() {
  const colors = [...SEAT_COLORS, '#facc15', '#2de2a6']
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {Array.from({ length: 36 }, (_, i) => {
        const left = (i * 37) % 100
        const size = 6 + ((i * 7) % 6)
        return (
          <motion.span
            key={i}
            className="absolute top-0 block rounded-sm"
            style={{ left: `${left}%`, width: size, height: size * 1.6, backgroundColor: colors[i % colors.length] }}
            initial={{ y: -30, rotate: 0, opacity: 1 }}
            animate={{ y: 520, rotate: 360 * (i % 2 ? 1 : -1) * 2, opacity: [1, 1, 0] }}
            transition={{ duration: 2.6 + (i % 5) * 0.35, delay: (i % 9) * 0.12, repeat: 1, ease: 'easeIn' }}
          />
        )
      })}
    </div>
  )
}

/** Game over: the winner, the final standings and the full score sheet. */
export function WinnerDialog({ state, mySeat, isHost, onClose, onPlayAgain, onHome }) {
  const totals = sumScores(state.rounds, state.players.length)
  const names = state.players.map((p) => p.name)
  const standings = rankPlayers(names, totals)
  const leaders = getLeaders(totals)
  const tie = leaders.length > 1
  const iWon = leaders.includes(mySeat)

  const headline = tie ? "It's a tie!" : iWon ? 'You win!' : `${names[leaders[0]]} wins!`
  const sub = tie
    ? `${leaders.map((i) => nameOf(state, i, mySeat)).join(' and ')} share first place with ${formatScore(totals[leaders[0]])}.`
    : `${formatScore(totals[leaders[0]])} points after ${state.rounds.length} round${state.rounds.length > 1 ? 's' : ''}.`

  return (
    <Modal
      onClose={onClose}
      labelledBy="winner-title"
      className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/40 bg-surface p-5 shadow-2xl sm:p-6"
    >
      <Confetti />
      <div className="relative">
        <div className="flex justify-end">
          <CloseButton onClose={onClose} label="Close results" />
        </div>

        <div className="-mt-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: [0, -8, 8, -4, 0] }}
            transition={{ scale: { type: 'spring', stiffness: 260, damping: 14 }, rotate: { delay: 0.4, duration: 0.8 } }}
            className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 shadow-[0_0_40px_-6px_rgb(var(--gold)/0.6)]"
          >
            <FaTrophy className="h-10 w-10 text-gold" aria-hidden="true" />
          </motion.div>

          <div className="mb-3 flex justify-center -space-x-2">
            {leaders.map((seat) => (
              <motion.span
                key={seat}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-full ring-4 ring-gold"
              >
                <Avatar name={names[seat]} seat={seat} size="lg" />
              </motion.span>
            ))}
          </div>

          <motion.h2
            id="winner-title"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-3xl text-ink"
          >
            {headline}
          </motion.h2>
          <p className="mt-1 text-mute">{sub}</p>
          {state.endedEarly && (
            <p className="mt-1 text-xs text-mute">
              The host ended the game after {state.rounds.length} of {state.totalRounds} rounds.
            </p>
          )}
        </div>

        <ol className="mt-5 space-y-2">
          {standings.map(({ index, rank }, i) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + 0.08 * i }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rank === 1 ? 'bg-gold/10 ring-1 ring-gold/40' : 'bg-raised/60'}`}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  MEDAL[rank - 1] ?? 'bg-raised text-mute'
                }`}
              >
                {rank}
              </span>
              <Avatar name={names[index]} seat={index} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold text-ink">{nameOf(state, index, mySeat)}</span>
              <span className={`text-lg font-extrabold tabular-nums ${totals[index] < 0 ? 'text-danger' : 'text-ink'}`}>
                {formatScore(totals[index])}
              </span>
            </motion.li>
          ))}
        </ol>

        <details className="mt-4 rounded-xl border border-line px-3 py-2">
          <summary className="cursor-pointer text-sm font-bold text-mute">Score by round</summary>
          <div className="mt-3">
            <ScoreTable state={state} mySeat={mySeat} />
          </div>
        </details>

        <div className="mt-5 space-y-3">
          {isHost ? (
            <button type="button" className="btn btn-primary w-full" onClick={onPlayAgain}>
              <FiRotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
            </button>
          ) : (
            <p className="text-center text-sm text-mute">Waiting for the host to start a new game.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-secondary" onClick={onHome}>
              <FiHome className="h-4 w-4" aria-hidden="true" /> Return home
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
