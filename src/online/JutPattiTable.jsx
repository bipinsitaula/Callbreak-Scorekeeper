import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaRobot, FaTrophy } from 'react-icons/fa'
import { FiChevronDown, FiHome, FiRotateCcw, FiX } from 'react-icons/fi'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { CARD_SIZE, CardBack, CardFace } from '../blackjack/PlayingCard'
import { useToastStore } from '../hooks/useToast'
import { useGameStore } from '../store'
import { rankPlayers } from '../utils/helpers'
import { seatOf } from './engine'
import {
  declare,
  describeAction,
  discardCard,
  drawPile,
  drawStock,
  findPairs,
  formatPoints,
  isJutPattiBotTurn,
  jutPattiBotMove,
  jutPattiStatus,
  nextRound,
  options,
  startJutPatti,
  totalScores,
} from './juttpatti'
import { seatSpot } from './layout'
import DealAnimation from './DealAnimation'
import ConnectionBadge from './ConnectionBadge'
import { ChatButton } from './ChatPanel'
import LeaveButton from './LeaveButton'
import HostMenu from './HostMenu'
import { Confetti } from './ResultsDialogs'
import { useOnlineStore } from './store'

const PILE_CARD = 'h-16 w-11 sm:h-[4.5rem] sm:w-[3.25rem]'

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

// The shuffle-and-deal animation plays once per deal per tab.
const seenKey = (code) => `jutpatti-dealt-${code}`
const readSeen = (code) => {
  try {
    return Number(sessionStorage.getItem(seenKey(code)))
  } catch {
    return 0
  }
}
const writeSeen = (code, id) => {
  try {
    sessionStorage.setItem(seenKey(code), String(id))
  } catch {
    /* ignore */
  }
}

/** Your hand with pairs together first, then the jokers left over, then singles high to low. */
const arrange = (cards, jokerRank) => {
  const pairs = findPairs(cards, jokerRank)
  const paired = new Set(pairs.flat().map((c) => c.id))
  const order = '23456789TJQKA'
  const value = (c) => order.indexOf(c.rank === '10' ? 'T' : c.rank)
  const rest = cards.filter((c) => !paired.has(c.id)).sort((a, b) => value(b) - value(a))
  return { cards: [...pairs.flat(), ...rest], paired, pairCount: pairs.length }
}

export default function JutPattiTable() {
  const code = useOnlineStore((s) => s.code)
  const state = useOnlineStore((s) => s.row.state)
  const me = useOnlineStore((s) => s.me)
  const online = useOnlineStore((s) => s.online)
  const act = useOnlineStore((s) => s.act)
  const leave = useOnlineStore((s) => s.leave)
  const recordGame = useOnlineStore((s) => s.recordGame)
  const setView = useGameStore((s) => s.setView)
  const toastError = useToastStore((s) => s.error)

  const n = state.players.length
  const mySeat = seatOf(state, me.id)
  const felt = useRef(null)
  const size = useSize(felt)
  const pending = useRef(false)
  const isHost = state.hostId === me.id
  const [picked, setPicked] = useState(null)

  /* ----- Shuffle & deal ----- */
  const [dealing, setDealing] = useState(0)
  useEffect(() => {
    if (state.status === 'playing' && !state.lastAction && state.dealId && readSeen(code) !== state.dealId) setDealing(state.dealId)
  }, [code, state.dealId, state.status, state.lastAction])
  const finishDeal = useCallback(() => {
    writeSeen(code, dealing)
    setDealing(0)
  }, [code, dealing])

  /* ----- Bots: the host's browser (or the first person online) makes their moves ----- */
  const humans = state.players.filter((p) => !p.bot)
  const driverId = (
    humans.find((p) => p.id === state.hostId && online.includes(p.id)) ??
    humans.find((p) => online.includes(p.id)) ??
    humans.find((p) => p.id === state.hostId)
  )?.id
  const botTurn = isJutPattiBotTurn(state)
  useEffect(() => {
    if (!botTurn || driverId !== me.id || dealing) return undefined
    const id = setTimeout(() => act((s, playerId) => jutPattiBotMove(s, playerId)), 1100)
    return () => clearTimeout(id)
  }, [botTurn, driverId, me.id, dealing, act, state.turn, state.phase, state.dealId, state.discard.length])

  /* ----- History ----- */
  useEffect(() => {
    if (state.status === 'finished') recordGame(useOnlineStore.getState().row.state)
  }, [state.status, state.gameId, recordGame])

  // A new turn or deal clears the card you had picked.
  useEffect(() => setPicked(null), [state.turn, state.phase, state.dealId])

  const run = async (action) => {
    if (pending.current) return false
    pending.current = true
    const result = await act(action)
    pending.current = false
    if (!result.ok) toastError(result.error)
    return result.ok
  }

  const o = mySeat >= 0 ? options(state, mySeat) : null
  const myHand = mySeat >= 0 ? (state.hands[mySeat] ?? []) : []
  const arranged = useMemo(() => arrange(myHand, state.jokerRank), [myHand, state.jokerRank])
  const showResult = state.status === 'roundEnd' && state.result
  const canDraw = Boolean(o) && !dealing
  const [closedWinner, setClosedWinner] = useState(null)
  const winnerOpen = state.status === 'finished' && closedWinner !== state.gameId
  const goHome = () => {
    leave()
    setView('hub')
  }
  const canDeclare = picked && o?.declare.includes(picked)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeaveButton />
        <div className="flex flex-wrap items-center gap-2">
          <HostMenu />
          <ChatButton />
          <ConnectionBadge />
        </div>
      </div>

      <section
        className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/15 via-surface to-surface p-3 shadow-panel sm:p-6"
        aria-label="Jut Patti table"
      >
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <Stat label="Round" value={`${state.round} of ${state.totalRounds}`} />
          <Stat label="Joker" value={state.jokerRank ? `${state.jokerRank}s are wild` : '–'} gold />
          <Stat label="Your score" value={mySeat >= 0 ? formatPoints(totalScores(state)[mySeat]) : '–'} />
        </div>

        {/* Felt */}
        <div
          ref={felt}
          className="relative isolate mt-4 h-[22rem] overflow-hidden rounded-[2rem] border border-accent/25 sm:h-[26rem]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgb(var(--accent) / 0.16), rgb(var(--accent) / 0.04) 60%, transparent 75%), rgb(var(--raised) / 0.55)',
          }}
        >
          <div aria-hidden="true" className="absolute inset-3 rounded-[1.6rem] border border-dashed border-accent/15" />

          {state.players.map((player, seat) => (
            <JPSeat
              key={player.id}
              state={state}
              player={player}
              seat={seat}
              spot={seatSpot(seat, mySeat, n)}
              isMe={seat === mySeat}
              online={online.includes(player.id)}
              dealing={Boolean(dealing)}
            />
          ))}

          {/* Piles */}
          {!dealing && state.status !== 'finished' && state.jokerCard && (
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
              <div className="flex items-end gap-2 sm:gap-3">
                <Pile label="Joker">
                  <div className={`${PILE_CARD} rounded-lg shadow-lg ring-2 ring-gold`}>
                    <CardFace card={state.jokerCard} small />
                  </div>
                </Pile>
                <Pile label={`Stock · ${state.stock.length}`}>
                  <button
                    type="button"
                    disabled={!(canDraw && o.drawStock)}
                    onClick={() => run((s, id) => drawStock(s, id))}
                    aria-label="Draw from the stock"
                    className={`${PILE_CARD} relative rounded-lg shadow-lg transition-transform ${canDraw && o.drawStock ? 'ring-2 ring-accent hover:-translate-y-1' : ''}`}
                  >
                    <CardBack />
                  </button>
                </Pile>
                <Pile label="Pile">
                  {state.discard.length ? (
                    <button
                      type="button"
                      disabled={!(canDraw && o.drawPile)}
                      onClick={() => run((s, id) => drawPile(s, id))}
                      aria-label="Take the top card of the discard pile"
                      className={`${PILE_CARD} rounded-lg shadow-lg transition-transform ${canDraw && o.drawPile ? 'ring-2 ring-accent hover:-translate-y-1' : ''}`}
                    >
                      <CardFace card={state.discard[state.discard.length - 1]} small />
                    </button>
                  ) : (
                    <div className={`${PILE_CARD} rounded-lg border-2 border-dashed border-line`} aria-label="Empty discard pile" />
                  )}
                </Pile>
              </div>
              <p className="mt-2 max-w-[14rem] text-xs font-bold text-mute" aria-live="polite">
                {describeAction(state, mySeat) ?? jutPattiStatus(state, mySeat)}
              </p>
            </div>
          )}

          {dealing > 0 && size.w > 0 && (
            <DealAnimation key={dealing} players={n} dealer={state.dealer} mySeat={mySeat} cardsEach={7} size={size} onDone={finishDeal} />
          )}

          {state.status === 'finished' && !winnerOpen && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
              <div className="w-full max-w-[15rem] rounded-2xl border border-line bg-surface/95 p-4 text-center shadow-2xl backdrop-blur">
                <p className="mb-3 font-extrabold text-ink">Game over</p>
                <div className="flex flex-col gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setClosedWinner(null)}>
                    Show winner
                  </button>
                  {isHost && (
                    <button type="button" className="btn btn-primary" onClick={() => run((s, id) => startJutPatti(s, id))}>
                      Play again
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={goHome}>
                    <FiHome className="h-4 w-4" aria-hidden="true" /> Return home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Round result */}
        <AnimatePresence>
          {showResult && <RoundResult state={state} mySeat={mySeat} onNext={() => run((s, id) => nextRound(s, id))} />}
        </AnimatePresence>

        {/* Your hand and moves */}
        {mySeat >= 0 && !dealing && state.status === 'playing' && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2" role="group" aria-label="Your cards">
              {arranged.cards.map((card) => {
                const isPicked = picked === card.id
                const joker = card.rank === state.jokerRank
                const fresh = state.drawn?.id === card.id
                return (
                  <motion.button
                    key={card.id}
                    type="button"
                    layout="position"
                    disabled={!o.discard}
                    onClick={() => setPicked(isPicked ? null : card.id)}
                    animate={{ y: isPicked ? -14 : 0 }}
                    aria-pressed={isPicked}
                    aria-label={`${card.rank} of ${card.suit}${joker ? ', joker' : ''}${arranged.paired.has(card.id) ? ', in a pair' : ''}`}
                    className={`relative rounded-xl shadow-lg ${CARD_SIZE} ${
                      isPicked ? 'ring-2 ring-accent' : joker ? 'ring-2 ring-gold' : arranged.paired.has(card.id) ? 'ring-2 ring-accent/50' : ''
                    } ${o.discard ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <CardFace card={card} />
                    {fresh && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 py-px text-[10px] font-extrabold text-slate-900">New</span>
                    )}
                  </motion.button>
                )
              })}
            </div>
            <p className="text-center text-sm font-bold text-ink">
              {arranged.pairCount} pair{arranged.pairCount === 1 ? '' : 's'}
              <span className="font-semibold text-mute"> · pairs ringed, jokers gold</span>
            </p>

            {o.discard ? (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Your move">
                <button
                  type="button"
                  className="btn btn-secondary flex-1 sm:min-w-[8rem] sm:flex-none"
                  disabled={!picked}
                  onClick={() => run((s, id) => discardCard(s, id, picked))}
                >
                  Discard
                </button>
                {o.declare.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary flex-1 sm:min-w-[8rem] sm:flex-none"
                    disabled={!canDeclare}
                    onClick={() => run((s, id) => declare(s, id, picked))}
                  >
                    Declare
                  </button>
                )}
              </div>
            ) : null}
            <p className="text-center text-sm font-semibold text-mute">
              {o.discard
                ? o.declare.length > 0
                  ? 'Three pairs! Pick a spare card, then declare.'
                  : 'Pick a card to throw away.'
                : state.turn === mySeat
                  ? 'Draw from the stock or the pile.'
                  : jutPattiStatus(state, mySeat)}
            </p>
          </div>
        )}
      </section>

      <RoundLog state={state} mySeat={mySeat} />

      {winnerOpen && (
        <WinnerDialog
          state={state}
          mySeat={mySeat}
          isHost={isHost}
          onClose={() => setClosedWinner(state.gameId)}
          onPlayAgain={() => run((s, id) => startJutPatti(s, id))}
          onHome={goHome}
        />
      )}
    </div>
  )
}

function Stat({ label, value, gold = false }) {
  return (
    <div className="rounded-xl bg-base/60 px-2 py-2">
      <div className="truncate text-[11px] font-bold text-mute sm:text-xs">{label}</div>
      <div className={`truncate text-base font-extrabold tabular-nums sm:text-lg ${gold ? 'text-gold' : 'text-ink'}`}>{value}</div>
    </div>
  )
}

function Pile({ label, children }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-mute">{label}</span>
    </div>
  )
}

function JPSeat({ state, player, seat, spot, isMe, online, dealing }) {
  const inRound = state.status === 'playing' || state.status === 'roundEnd'
  const isTurn = !dealing && state.status === 'playing' && state.turn === seat
  const won = state.status === 'roundEnd' && state.result?.winner === seat
  const count = state.hands[seat]?.length ?? 0
  const upper = spot.y < 35
  const fan = !isMe && !dealing && inRound && count > 0 && (
    <div className={`flex ${upper ? 'mt-1' : 'mb-1'}`} aria-hidden="true">
      {Array.from({ length: Math.min(count, 4) }, (_, i) => (
        <div key={i} className={`h-9 w-6 rounded-md shadow sm:h-12 sm:w-8 ${i ? '-ml-4 sm:-ml-5' : ''}`} style={{ rotate: `${(i - 1.5) * 7}deg` }}>
          <CardBack />
        </div>
      ))}
    </div>
  )

  return (
    <div
      className="absolute z-10 flex w-[4.75rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 sm:w-28"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
    >
      {!upper && fan}
      <div className="relative">
        {isTurn && <span aria-hidden="true" className="absolute -inset-1.5 animate-pulse rounded-full ring-2 ring-accent" />}
        {won && <span aria-hidden="true" className="absolute -inset-2 rounded-full ring-4 ring-gold" />}
        <Avatar name={player.name} seat={seat} />
        {player.bot ? (
          <span title="Bot" className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-raised text-accent">
            <FaRobot className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        ) : (
          <span
            title={online ? 'Online' : 'Away'}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${online ? 'bg-accent' : 'bg-faint'}`}
          />
        )}
        {state.dealer === seat && (
          <span title="Dealer" className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-extrabold text-slate-900">
            D
          </span>
        )}
      </div>
      <p className={`max-w-full truncate text-xs font-bold ${isTurn ? 'text-accent' : 'text-ink'}`}>{isMe ? 'You' : player.name}</p>
      <p className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-mute">
        {inRound && count ? `${count} cards · ` : ''}
        {formatPoints(totalScores(state)[seat])}
      </p>
      {upper && fan}
    </div>
  )
}

/** Everyone's final cards for the round, with the points each player gained or lost. */
function RoundResult({ state, mySeat, onNext }) {
  const { winner, hands, unpaired } = state.result
  const last = state.rounds[state.rounds.length - 1]
  const name = (seat) => (seat === mySeat ? 'You' : state.players[seat]?.name)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="mt-4 rounded-2xl border border-gold/40 bg-surface/95 p-4 shadow-2xl"
      role="status"
    >
      <div className="text-center">
        <FaTrophy className="mx-auto mb-1 h-6 w-6 text-gold" aria-hidden="true" />
        <p className="text-lg font-extrabold text-ink">
          {name(winner)} {winner === mySeat ? 'win' : 'wins'} round {state.round}
        </p>
        <p className="mb-3 text-sm text-mute">Declared three pairs.</p>
      </div>
      <ul className="space-y-2">
        {state.players.map((p, seat) => {
          const pairs = findPairs(hands[seat], state.jokerRank)
          const paired = new Set(pairs.flat().map((c) => c.id))
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-raised/60 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={p.name} seat={seat} size="sm" />
                <span className="truncate text-sm font-bold text-ink">{name(seat)}</span>
              </span>
              <span className="flex">
                {[...pairs.flat(), ...hands[seat].filter((c) => !paired.has(c.id))].map((card, i) => (
                  <span key={card.id} className={`h-11 w-8 sm:h-14 sm:w-10 ${i ? '-ml-3 sm:-ml-4' : ''} ${paired.has(card.id) ? '' : 'opacity-60'}`}>
                    <CardFace card={card} small />
                  </span>
                ))}
              </span>
              <span className={`ml-auto text-sm font-extrabold tabular-nums ${last.scores[seat] < 0 ? 'text-danger' : 'text-gold'}`}>
                {formatPoints(last.scores[seat])}
                <span className="ml-1 text-xs font-semibold text-mute">{seat === winner ? '' : `(${unpaired[seat]} unpaired)`}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn btn-primary mt-4 w-full" onClick={onNext}>
        Deal round {state.round + 1}
      </button>
    </motion.div>
  )
}

/** Collapsible list of finished rounds with the running totals. */
function RoundLog({ state, mySeat }) {
  const [open, setOpen] = useState(false)
  const totals = totalScores(state)
  const leader = rankPlayers(
    state.players.map((p) => p.name),
    totals
  )[0]
  return (
    <section className="panel !p-0" aria-labelledby="round-log-title">
      <h2 id="round-log-title">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left sm:px-6">
          <span className="min-w-0 flex-1">
            <span className="block text-lg text-ink">Rounds &amp; scores</span>
            <span className="block truncate text-sm font-semibold text-mute">
              {state.rounds.length
                ? `${state.rounds.length} of ${state.totalRounds} rounds played · ${leader.index === mySeat ? 'You lead' : `${leader.name} leads`} on ${formatPoints(leader.score)}`
                : 'Round results appear here'}
            </span>
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex-shrink-0 text-mute">
            <FiChevronDown className="h-5 w-5" aria-hidden="true" />
          </motion.span>
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line px-4 pb-4 pt-3 sm:px-6">
              <ol className="flex flex-wrap gap-2">
                {state.players.map((p, i) => (
                  <li key={p.id} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${i === mySeat ? 'bg-accent/10 ring-1 ring-accent/40' : 'bg-raised/70'}`}>
                    <Avatar name={p.name} seat={i} size="sm" />
                    <span className="font-bold text-ink">{i === mySeat ? 'You' : p.name}</span>
                    <span className="font-extrabold tabular-nums text-gold">{formatPoints(totals[i])}</span>
                  </li>
                ))}
              </ol>
              {state.rounds.length === 0 ? (
                <p className="text-sm text-mute">No rounds finished yet.</p>
              ) : (
                <ol className="text-sm">
                  {[...state.rounds].reverse().map((r) => (
                    <li key={r.round} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
                      <span className="font-bold text-mute">Round {r.round}</span>
                      <span className="text-ink">{r.winner === mySeat ? 'You' : state.players[r.winner]?.name} declared three pairs</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

const MEDAL = ['bg-gold text-slate-900', 'bg-slate-300 text-slate-900', 'bg-amber-700 text-white']

function WinnerDialog({ state, mySeat, isHost, onClose, onPlayAgain, onHome }) {
  const names = state.players.map((p) => p.name)
  const totals = totalScores(state)
  const standings = rankPlayers(names, totals)
  const leaders = standings.filter((s) => s.rank === 1).map((s) => s.index)
  const tie = leaders.length > 1
  const headline = tie ? "It's a tie!" : leaders[0] === mySeat ? 'You win!' : `${names[leaders[0]]} wins!`

  return (
    <Modal onClose={onClose} labelledBy="jp-winner-title" className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/40 bg-surface p-5 shadow-2xl sm:p-6">
      <Confetti />
      <div className="relative">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} aria-label="Close results" className="rounded-lg p-2 text-mute hover:bg-raised hover:text-ink">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="-mt-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: [0, -8, 8, -4, 0] }}
            transition={{ scale: { type: 'spring', stiffness: 260, damping: 14 }, rotate: { delay: 0.4, duration: 0.8 } }}
            className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gold/15"
          >
            <FaTrophy className="h-10 w-10 text-gold" aria-hidden="true" />
          </motion.div>
          <div className="mb-3 flex justify-center -space-x-2">
            {leaders.map((seat) => (
              <span key={seat} className="rounded-full ring-4 ring-gold">
                <Avatar name={names[seat]} seat={seat} size="lg" />
              </span>
            ))}
          </div>
          <h2 id="jp-winner-title" className="text-3xl text-ink">
            {headline}
          </h2>
          <p className="mt-1 text-mute">
            {formatPoints(totals[leaders[0]])} points after {state.rounds.length} round{state.rounds.length === 1 ? '' : 's'}.
          </p>
          {state.endedEarly && <p className="mt-1 text-xs text-mute">The host ended the game early.</p>}
        </div>

        <ol className="mt-5 space-y-2">
          {standings.map(({ index, rank }, i) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + 0.08 * i }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rank === 1 ? 'bg-gold/10 ring-1 ring-gold/40' : 'bg-raised/60'}`}
            >
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${MEDAL[rank - 1] ?? 'bg-raised text-mute'}`}>{rank}</span>
              <Avatar name={names[index]} seat={index} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold text-ink">{index === mySeat ? 'You' : names[index]}</span>
              <span className="text-lg font-extrabold tabular-nums text-ink">{formatPoints(totals[index])}</span>
            </motion.li>
          ))}
        </ol>

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
