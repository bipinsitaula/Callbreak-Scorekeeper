import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaRobot, FaTrophy } from 'react-icons/fa'
import { FiChevronDown, FiEye, FiHome, FiRotateCcw, FiX } from 'react-icons/fi'
import { RiCoinsLine } from 'react-icons/ri'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { CARD_SIZE, CardBack, CardFace } from '../blackjack/PlayingCard'
import { useToastStore } from '../hooks/useToast'
import { useGameStore } from '../store'
import { rankPlayers } from '../utils/helpers'
import { seatOf } from './engine'
import {
  allIn,
  chaal,
  describeAction,
  handName,
  isTeenPattiBotTurn,
  nextHand,
  options,
  pack,
  raise,
  seeCards,
  show,
  startTeenPatti,
  teenPattiBotMove,
  teenPattiStatus,
} from './teenpatti'
import { seatSpot } from './layout'
import DealAnimation from './DealAnimation'
import ConnectionBadge from './ConnectionBadge'
import { ChatButton } from './ChatPanel'
import LeaveButton from './LeaveButton'
import HostMenu from './HostMenu'
import { Confetti } from './ResultsDialogs'
import { useOnlineStore } from './store'

const fmt = (n) => (n ?? 0).toLocaleString()
const REASON = { fold: 'everyone else packed', show: 'show', allin: 'all-in showdown' }

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
const seenKey = (code) => `teenpatti-dealt-${code}`
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

export default function TeenPattiTable() {
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

  /* ----- Shuffle & deal ----- */
  const [dealing, setDealing] = useState(0)
  useEffect(() => {
    if (state.status === 'betting' && !state.lastAction && state.dealId && readSeen(code) !== state.dealId) setDealing(state.dealId)
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
  const botTurn = isTeenPattiBotTurn(state)
  useEffect(() => {
    if (!botTurn || driverId !== me.id || dealing) return undefined
    const id = setTimeout(() => act((s, playerId) => teenPattiBotMove(s, playerId)), 1000)
    return () => clearTimeout(id)
  }, [botTurn, driverId, me.id, dealing, act, state.turn, state.pot, state.dealId])

  /* ----- History ----- */
  useEffect(() => {
    if (state.status === 'finished') recordGame(useOnlineStore.getState().row.state)
  }, [state.status, state.gameId, recordGame])

  const run = async (action) => {
    if (pending.current) return false
    pending.current = true
    const result = await act(action)
    pending.current = false
    if (!result.ok) toastError(result.error)
    return result.ok
  }

  const o = mySeat >= 0 ? options(state, mySeat) : null
  const myTurn = Boolean(o?.pack) && !dealing
  const myCards = mySeat >= 0 ? (state.cards[mySeat] ?? []) : []
  const showResult = state.status === 'handEnd' && state.result
  const [closedWinner, setClosedWinner] = useState(null)
  const winnerOpen = state.status === 'finished' && closedWinner !== state.gameId
  const goHome = () => {
    leave()
    setView('hub')
  }

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
        aria-label="Teen Patti table"
      >
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <Stat label="Hand" value={`${state.hand} of ${state.totalHands}`} />
          <Stat label="Pot" value={fmt(state.pot || state.result?.pot)} gold />
          <Stat label="Your chips" value={mySeat >= 0 ? fmt(state.chips[mySeat]) : '–'} />
        </div>

        {/* Felt */}
        <div
          ref={felt}
          className="relative isolate mt-4 h-[24rem] overflow-hidden rounded-[2rem] border border-accent/25 sm:h-[28rem]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgb(var(--accent) / 0.16), rgb(var(--accent) / 0.04) 60%, transparent 75%), rgb(var(--raised) / 0.55)',
          }}
        >
          <div aria-hidden="true" className="absolute inset-3 rounded-[1.6rem] border border-dashed border-accent/15" />

          {state.players.map((player, seat) => (
            <TPSeat
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

          {/* Pot */}
          {!dealing && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
              <motion.div
                key={state.pot}
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="flex items-center gap-2 rounded-full border border-gold/40 bg-base/80 px-4 py-2 shadow-lg"
              >
                <RiCoinsLine className="h-5 w-5 text-gold" aria-hidden="true" />
                <span className="text-lg font-extrabold tabular-nums text-ink">{fmt(state.pot || state.result?.pot)}</span>
              </motion.div>
              {state.status === 'betting' && (
                <p className="mt-2 text-xs font-semibold text-mute">
                  Blind {fmt(state.stake)} · Seen {fmt(state.stake * 2)}
                </p>
              )}
              <p className="mt-1 max-w-[12rem] text-xs font-bold text-mute" aria-live="polite">
                {describeAction(state, mySeat) ?? teenPattiStatus(state, mySeat)}
              </p>
            </div>
          )}

          {dealing > 0 && size.w > 0 && (
            <DealAnimation key={dealing} players={n} dealer={state.dealer} mySeat={mySeat} cardsEach={3} size={size} onDone={finishDeal} />
          )}

          <AnimatePresence>
            {showResult && <HandResult state={state} mySeat={mySeat} onNext={() => run((s, id) => nextHand(s, id))} />}
          </AnimatePresence>

          {state.status === 'finished' && !winnerOpen && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
              <div className="w-full max-w-[15rem] rounded-2xl border border-line bg-surface/95 p-4 text-center shadow-2xl backdrop-blur">
                <p className="mb-3 font-extrabold text-ink">Game over</p>
                <div className="flex flex-col gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setClosedWinner(null)}>
                    Show winner
                  </button>
                  {isHost && (
                    <button type="button" className="btn btn-primary" onClick={() => run((s, id) => startTeenPatti(s, id))}>
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

        {/* Your cards and moves */}
        {mySeat >= 0 && !dealing && state.status !== 'finished' && (
          <div className="mt-4 space-y-4">
            <MyCards cards={myCards} seen={state.seen[mySeat]} folded={state.folded[mySeat]} canSee={o.see} onSee={() => run((s, id) => seeCards(s, id))} />
            {myTurn && (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Your move">
                <button type="button" className="btn btn-secondary flex-1 sm:flex-none sm:min-w-[6.5rem]" onClick={() => run((s, id) => pack(s, id))}>
                  Pack
                </button>
                {o.chaal && (
                  <button type="button" className="btn btn-primary flex-1 sm:flex-none sm:min-w-[7.5rem]" onClick={() => run((s, id) => chaal(s, id))}>
                    Chaal {fmt(o.call)}
                  </button>
                )}
                {o.raiseTo !== null && (
                  <button type="button" className="btn btn-secondary flex-1 sm:flex-none sm:min-w-[7.5rem]" disabled={!o.raise} onClick={() => run((s, id) => raise(s, id))}>
                    Raise {fmt(o.raiseTo)}
                  </button>
                )}
                {o.show && (
                  <button type="button" className="btn btn-secondary flex-1 sm:flex-none sm:min-w-[7.5rem]" onClick={() => run((s, id) => show(s, id))}>
                    Show {fmt(o.call)}
                  </button>
                )}
                {o.allIn && (
                  <button type="button" className="btn btn-primary flex-1 sm:flex-none sm:min-w-[7.5rem]" onClick={() => run((s, id) => allIn(s, id))}>
                    All in {fmt(state.chips[mySeat])}
                  </button>
                )}
              </div>
            )}
            {!myTurn && state.status === 'betting' && !state.folded[mySeat] && (
              <p className="text-center text-sm font-semibold text-mute">{teenPattiStatus(state, mySeat)}</p>
            )}
          </div>
        )}
      </section>

      <HandLog state={state} mySeat={mySeat} />

      {winnerOpen && (
        <WinnerDialog
          state={state}
          mySeat={mySeat}
          isHost={isHost}
          onClose={() => setClosedWinner(state.gameId)}
          onPlayAgain={() => run((s, id) => startTeenPatti(s, id))}
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

function TPSeat({ state, player, seat, spot, isMe, online, dealing }) {
  const inHand = state.status === 'betting' || state.status === 'handEnd'
  const folded = state.folded[seat]
  const isTurn = !dealing && state.status === 'betting' && state.turn === seat
  const won = state.status === 'handEnd' && state.result?.winners.includes(seat)
  const shown = state.result?.shown?.[seat]
  const tag = !inHand || !state.cards[seat]?.length ? (state.chips[seat] < state.boot ? 'Out' : null) : folded ? 'Packed' : state.seen[seat] ? 'Seen' : 'Blind'
  const tagStyle = { Packed: 'bg-danger/15 text-danger', Seen: 'bg-accent/15 text-accent', Blind: 'bg-gold/15 text-gold', Out: 'bg-raised text-mute' }

  // Cards: backs while hidden, faces once shown at the end of a hand. Seats near the top of
  // the felt show them underneath, so they aren't cut off by the edge.
  const upper = spot.y < 35
  const fan = !isMe && !dealing && state.cards[seat]?.length > 0 && !folded && (
        <div className={`flex ${upper ? 'mt-1' : 'mb-1'}`} aria-hidden={!shown}>
          {(shown ?? [0, 1, 2]).map((card, i) => (
            <motion.div
              key={shown ? card.id : i}
              initial={shown ? { rotateY: 90 } : false}
              animate={{ rotateY: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`h-11 w-8 rounded-md shadow sm:h-14 sm:w-10 ${i ? '-ml-4 sm:-ml-5' : ''}`}
              style={{ rotate: `${(i - 1) * 8}deg` }}
            >
              {shown ? <CardFace card={card} small /> : <CardBack />}
            </motion.div>
          ))}
        </div>
      )

  return (
    <div
      className={`absolute z-10 flex w-[4.75rem] -translate-x-1/2 ${upper ? "-translate-y-[30%]" : "-translate-y-1/2"} flex-col items-center gap-0.5 sm:w-28 ${folded && inHand ? 'opacity-60' : ''}`}
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
      <p className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold tabular-nums text-mute">
        <RiCoinsLine className="h-3 w-3 text-gold" aria-hidden="true" />
        {fmt(state.chips[seat])}
      </p>
      {tag && <span className={`rounded-full px-2 py-px text-[10px] font-extrabold uppercase tracking-wide ${tagStyle[tag]}`}>{tag}</span>}
      {upper && fan}
    </div>
  )
}

/** Your three cards: face down until you choose to see them, then they flip over. */
function MyCards({ cards, seen, folded, canSee, onSee }) {
  if (!cards.length) return <p className="text-center text-sm text-mute">You’re sitting this hand out.</p>
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`flex justify-center gap-2 ${folded ? 'opacity-50 grayscale' : ''}`} style={{ perspective: 800 }}>
        {cards.map((card, i) => (
          <motion.div
            key={`${card.id}-${seen ? 'face' : 'back'}`}
            initial={{ rotateY: seen ? -90 : 0, y: seen ? 0 : 30, opacity: seen ? 1 : 0 }}
            animate={{ rotateY: 0, y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
            whileHover={seen ? { y: -10, scale: 1.08 } : undefined}
            className={`relative rounded-xl shadow-lg ${CARD_SIZE}`}
            role="img"
            aria-label={seen ? `${card.rank} of ${card.suit}` : 'Face-down card'}
          >
            {seen ? <CardFace card={card} /> : <CardBack />}
          </motion.div>
        ))}
      </div>
      {seen ? (
        <p className="text-sm font-bold text-ink">
          {handName(cards)}
          {folded && <span className="font-semibold text-danger"> · packed</span>}
        </p>
      ) : (
        canSee && (
          <button type="button" className="btn btn-secondary !min-h-0 !py-2" onClick={onSee}>
            <FiEye className="h-4 w-4" aria-hidden="true" /> See cards
            <span className="text-xs font-semibold text-mute">(you’ll bet double)</span>
          </button>
        )
      )}
    </div>
  )
}

function HandResult({ state, mySeat, onNext }) {
  const { winners, reason, pot, shown } = state.result
  const names = winners.map((w) => (w === mySeat ? 'You' : state.players[w]?.name))
  const winningHand = shown[winners[0]] ? handName(shown[winners[0]]) : null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-x-3 top-1/2 z-30 mx-auto max-w-xs -translate-y-1/2 rounded-2xl border border-gold/40 bg-surface/95 p-4 text-center shadow-2xl backdrop-blur"
      role="status"
    >
      <FaTrophy className="mx-auto mb-1 h-6 w-6 text-gold" aria-hidden="true" />
      <p className="text-lg font-extrabold text-ink">
        {names.join(' & ')} {names.length === 1 && names[0] === 'You' ? 'win' : names.length > 1 ? 'split' : 'wins'} {fmt(pot)}
      </p>
      <p className="mb-3 text-sm text-mute">
        {winningHand ? `${winningHand} · ` : ''}
        {REASON[reason]}
      </p>
      <button type="button" className="btn btn-primary w-full" onClick={onNext}>
        Deal hand {state.hand + 1}
      </button>
    </motion.div>
  )
}

/** Collapsible list of finished hands with the current chip counts. */
function HandLog({ state, mySeat }) {
  const [open, setOpen] = useState(false)
  const leader = rankPlayers(
    state.players.map((p) => p.name),
    state.chips
  )[0]
  return (
    <section className="panel !p-0" aria-labelledby="hand-log-title">
      <h2 id="hand-log-title">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left sm:px-6">
          <span className="min-w-0 flex-1">
            <span className="block text-lg text-ink">Hands &amp; chips</span>
            <span className="block truncate text-sm font-semibold text-mute">
              {state.rounds.length
                ? `${state.rounds.length} of ${state.totalHands} hands played · ${leader.index === mySeat ? 'You lead' : `${leader.name} leads`} with ${fmt(leader.score)}`
                : 'Hand results appear here'}
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
                    <span className="font-extrabold tabular-nums text-gold">{fmt(state.chips[i])}</span>
                  </li>
                ))}
              </ol>
              {state.rounds.length === 0 ? (
                <p className="text-sm text-mute">No hands finished yet.</p>
              ) : (
                <ol className="text-sm">
                  {[...state.rounds].reverse().map((r) => (
                    <li key={r.hand} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line py-1.5 first:border-t-0">
                      <span className="font-bold text-mute">Hand {r.hand}</span>
                      <span className="text-ink">
                        {r.winners.map((w) => (w === mySeat ? 'You' : state.players[w]?.name)).join(' & ')} won {fmt(r.pot)}
                        <span className="text-mute"> ({REASON[r.reason]})</span>
                      </span>
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
  const standings = rankPlayers(names, state.chips)
  const leaders = standings.filter((s) => s.rank === 1).map((s) => s.index)
  const tie = leaders.length > 1
  const headline = tie ? "It's a tie!" : leaders[0] === mySeat ? 'You win!' : `${names[leaders[0]]} wins!`

  return (
    <Modal onClose={onClose} labelledBy="tp-winner-title" className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gold/40 bg-surface p-5 shadow-2xl sm:p-6">
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
          <h2 id="tp-winner-title" className="text-3xl text-ink">
            {headline}
          </h2>
          <p className="mt-1 text-mute">
            {fmt(state.chips[leaders[0]])} chips after {state.rounds.length} hand{state.rounds.length === 1 ? '' : 's'}.
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
              <span className="flex items-center gap-1 text-lg font-extrabold tabular-nums text-ink">
                <RiCoinsLine className="h-4 w-4 text-gold" aria-hidden="true" />
                {fmt(state.chips[index])}
              </span>
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
