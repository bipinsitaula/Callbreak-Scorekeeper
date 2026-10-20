import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Avatar from '../components/Avatar'
import { CardBack, CardFace } from '../blackjack/PlayingCard'
import { SUITS } from '../blackjack/engine'
import { useToastStore } from '../hooks/useToast'
import { getCardsPerPlayer, getMaxBid } from '../utils/helpers'
import { FaRobot } from 'react-icons/fa'
import { botMove, isBotTurn, legalCards, nextRound, placeBid, playCard, seatOf, startGame, statusText } from './engine'
import { TABLE_CARD, seatOffset, seatSpot, trickOffset } from './layout'
import DealAnimation from './DealAnimation'
import ConnectionBadge from './ConnectionBadge'
import LeaveButton from './LeaveButton'
import BidDialog from './BidDialog'
import Hand from './Hand'
import HostMenu from './HostMenu'
import { RoundScoresDialog, ScoreSheet, WinnerDialog } from './ResultsDialogs'
import { useOnlineStore } from './store'

const TRICK_HOLD_MS = 1300 // how long a finished trick stays on the felt before it is collected
const SUIT = Object.fromEntries(SUITS.map((s) => [s.id, s]))

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


// The deal animation plays once per deal per tab, not again after a refresh.
const seenKey = (code) => `callbreak-dealt-${code}`
const readSeen = (code) => {
  try {
    return Number(sessionStorage.getItem(seenKey(code)))
  } catch {
    return 0
  }
}
const writeSeen = (code, dealId) => {
  try {
    sessionStorage.setItem(seenKey(code), String(dealId))
  } catch {
    /* ignore */
  }
}

export default function OnlineTable() {
  const code = useOnlineStore((s) => s.code)
  const state = useOnlineStore((s) => s.row.state)
  const me = useOnlineStore((s) => s.me)
  const online = useOnlineStore((s) => s.online)
  const act = useOnlineStore((s) => s.act)
  const toastError = useToastStore((s) => s.error)

  const n = state.players.length
  const mySeat = seatOf(state, me.id)
  const felt = useRef(null)
  const size = useSize(felt)
  const pending = useRef(false)

  /* ----- Shuffle & deal animation ----- */
  const [dealing, setDealing] = useState(0)
  useEffect(() => {
    if (state.status === 'bidding' && state.trickNo === 0 && state.dealId && readSeen(code) !== state.dealId) {
      setDealing(state.dealId)
    }
  }, [code, state.dealId, state.status, state.trickNo])
  const finishDeal = useCallback(() => {
    writeSeen(code, dealing)
    setDealing(0)
  }, [code, dealing])

  /* ----- A finished trick stays visible briefly, then flies to its winner ----- */
  const [shown, setShown] = useState(null)
  const lastKey = state.lastTrick ? `${state.dealId}-${state.lastTrick.id}` : null
  useEffect(() => {
    if (!lastKey) {
      setShown(null)
      return undefined
    }
    setShown(useOnlineStore.getState().row.state.lastTrick)
    const id = setTimeout(() => setShown(null), TRICK_HOLD_MS)
    return () => clearTimeout(id)
  }, [lastKey])

  const holding = state.trick.length === 0 && Boolean(shown)
  const centerPlays = state.trick.length ? state.trick : (shown?.plays ?? [])
  const collectTo = state.lastTrick ? seatOffset(state.lastTrick.winner, mySeat, n, size, 0.85) : { x: 0, y: 0 }

  /* ----- Your hand ----- */
  const hand = mySeat >= 0 ? (state.hands[mySeat] ?? []) : []
  const myTurn = mySeat >= 0 && state.turn === mySeat
  const canPlay = state.status === 'playing' && myTurn && !holding && !dealing
  const playable = canPlay ? new Set(legalCards(hand, state.trick).map((c) => c.id)) : null
  const ledSuit = state.trick[0]?.card.suit

  /* ----- Bots: one person's browser plays their moves (the host's, or the first person online) ----- */
  const humans = state.players.filter((p) => !p.bot)
  const driverId = (
    humans.find((p) => p.id === state.hostId && online.includes(p.id)) ??
    humans.find((p) => online.includes(p.id)) ??
    humans.find((p) => p.id === state.hostId)
  )?.id
  const botTurn = isBotTurn(state)
  useEffect(() => {
    if (!botTurn || driverId !== me.id || dealing || holding) return undefined
    // A short pause so bot moves read like someone thinking, not instant.
    const id = setTimeout(() => act((s, playerId) => botMove(s, playerId)), state.status === 'bidding' ? 900 : 800)
    return () => clearTimeout(id)
  }, [botTurn, driverId, me.id, dealing, holding, act, state.status, state.turn, state.trickNo, state.dealId])

  const run = async (action) => {
    if (pending.current) return false
    pending.current = true
    const result = await act(action)
    pending.current = false
    if (!result.ok) toastError(result.error)
    return result.ok
  }

  const onPlay = (card) => run((s, id) => playCard(s, id, card.id))
  const onBid = (bid) => run((s, id) => placeBid(s, id, bid))

  // Round scores / winner pop-up, once the last trick has been collected. Closing it leaves a
  // small panel on the felt to reopen it.
  const showResults = (state.status === 'roundEnd' || state.status === 'finished') && !shown && !dealing
  const resultsKey = showResults ? `${state.dealId}-${state.status}` : null
  const [closedResults, setClosedResults] = useState(null)
  const resultsOpen = Boolean(resultsKey) && closedResults !== resultsKey
  const closeResults = () => setClosedResults(resultsKey)
  const isHost = state.hostId === me.id
  const dealNext = () => run((s, id) => nextRound(s, id))
  const playAgain = () => run((s, id) => startGame(s, id))
  const myBid = mySeat >= 0 ? state.bids[mySeat] : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeaveButton />
        <div className="flex flex-wrap items-center gap-2">
          <HostMenu />
          <ConnectionBadge />
        </div>
      </div>

      <section
        className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/15 via-surface to-surface p-3 shadow-panel sm:p-6"
        aria-label="Call Break table"
      >
        {/* Status row */}
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <Stat label="Round" value={`${state.round} of ${state.totalRounds}`} />
          <Stat label="Room" value={code} mono />
          <Stat label="You: won / bid" value={myBid == null ? '–' : `${state.won[mySeat]} / ${myBid}`} />
        </div>

        {/* Felt */}
        <div
          ref={felt}
          className="relative mt-4 h-[23rem] overflow-hidden rounded-[2rem] border border-accent/25 sm:h-[27rem]"
          style={{
            background:
              'radial-gradient(ellipse at center, rgb(var(--accent) / 0.16), rgb(var(--accent) / 0.04) 60%, transparent 75%), rgb(var(--raised) / 0.55)',
          }}
        >
          <div aria-hidden="true" className="absolute inset-3 rounded-[1.6rem] border border-dashed border-accent/15" />

          {state.players.map((player, seat) => (
            <Seat
              key={player.id}
              player={player}
              seat={seat}
              spot={seatSpot(seat, mySeat, n)}
              isMe={seat === mySeat}
              isTurn={!dealing && state.turn === seat && (state.status === 'bidding' || state.status === 'playing')}
              isDealer={state.dealer === seat}
              online={online.includes(player.id)}
              bid={state.bids[seat]}
              won={state.won[seat]}
              cards={dealing ? 0 : (state.hands[seat]?.length ?? 0)}
              bidding={state.status === 'bidding'}
            />
          ))}

          {/* Cards on the table */}
          <div className="absolute left-1/2 top-1/2 h-0 w-0">
            <AnimatePresence custom={collectTo}>
              {centerPlays.map(({ seat, card }) => {
                const from = seatOffset(seat, mySeat, n, size, seat === mySeat ? 1.3 : 1)
                const at = trickOffset(seat, mySeat, n, size)
                const won = holding && shown?.winner === seat
                return (
                  <motion.div
                    key={card.id}
                    custom={collectTo}
                    variants={{ collect: (to) => ({ x: to.x, y: to.y, scale: 0.45, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }) }}
                    initial={{ x: from.x, y: from.y, scale: 0.8, rotate: 0, opacity: 0 }}
                    animate={{ x: at.x, y: at.y, scale: won ? 1.08 : 1, rotate: ((seat * 53) % 15) - 7, opacity: 1 }}
                    exit="collect"
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className={`absolute rounded-xl shadow-xl ${TABLE_CARD} ${won ? 'z-10 ring-4 ring-gold' : ''}`}
                    role="img"
                    aria-label={`${state.players[seat]?.name}: ${card.rank} of ${card.suit}`}
                  >
                    <CardFace card={card} small />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Centre caption */}
          {!dealing && centerPlays.length === 0 && !showResults && (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-24 text-center text-sm font-bold text-mute">
              {statusText(state, mySeat)}
            </p>
          )}
          {holding && shown && (
            <p className="absolute inset-x-0 top-[66%] text-center text-sm font-bold text-gold" aria-live="polite">
              {shown.winner === mySeat ? 'You win the trick' : `${state.players[shown.winner]?.name} wins the trick`}
            </p>
          )}

          {dealing > 0 && size.w > 0 && (
            <DealAnimation
              key={dealing}
              players={n}
              dealer={state.dealer}
              mySeat={mySeat}
              cardsEach={getCardsPerPlayer(n)}
              size={size}
              onDone={finishDeal}
            />
          )}

          {showResults && !resultsOpen && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
              <div className="w-full max-w-[15rem] rounded-2xl border border-line bg-surface/95 p-4 text-center shadow-2xl backdrop-blur">
                <p className="mb-3 font-extrabold text-ink">
                  {state.status === 'finished' ? 'Game over' : `Round ${state.round} complete`}
                </p>
                <div className="flex flex-col gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setClosedResults(null)}>
                    {state.status === 'finished' ? 'Show winner' : 'View scores'}
                  </button>
                  {state.status === 'roundEnd' && (
                    <button type="button" className="btn btn-primary" onClick={dealNext}>
                      Deal round {state.round + 1}
                    </button>
                  )}
                  {state.status === 'finished' && isHost && (
                    <button type="button" className="btn btn-primary" onClick={playAgain}>
                      Play again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {resultsOpen && state.status === 'roundEnd' && (
          <RoundScoresDialog state={state} mySeat={mySeat} onClose={closeResults} onNext={dealNext} />
        )}
        {resultsOpen && state.status === 'finished' && (
          <WinnerDialog state={state} mySeat={mySeat} isHost={isHost} onClose={closeResults} onPlayAgain={playAgain} />
        )}

        {/* Prompt */}
        <div className="mt-4 flex min-h-[2.5rem] flex-col items-center justify-center gap-1 text-center" aria-live="polite">
          {!dealing && state.status === 'playing' && centerPlays.length > 0 && (
            <p className={`font-bold ${myTurn ? 'text-accent' : 'text-mute'}`}>
              {statusText(state, mySeat)}
              {myTurn && ledSuit && !holding && (
                <span className="ml-2 font-semibold text-mute">
                  {SUIT[ledSuit].symbol} {ledSuit} led
                </span>
              )}
            </p>
          )}
        </div>

        {!dealing && state.status === 'bidding' && myTurn && (
          <BidDialog
            key={state.dealId}
            max={getMaxBid(n)}
            hand={hand}
            players={state.players}
            bids={state.bids}
            mySeat={mySeat}
            onBid={onBid}
          />
        )}

        {/* Your hand */}
        {!dealing && mySeat >= 0 && (state.status === 'bidding' || state.status === 'playing') && <Hand cards={hand} playable={playable} onPlay={onPlay} dealId={state.dealId} ledSuit={ledSuit} />}
      </section>

      {state.rounds.length > 0 && <ScoreSheet state={state} mySeat={mySeat} />}
    </div>
  )
}

function Stat({ label, value, mono = false }) {
  return (
    <div className="rounded-xl bg-base/60 px-2 py-2">
      <div className="truncate text-[11px] font-bold text-mute sm:text-xs">{label}</div>
      <div className={`truncate text-base font-extrabold tabular-nums text-ink sm:text-lg ${mono ? 'tracking-[0.2em]' : ''}`}>{value}</div>
    </div>
  )
}

function Seat({ player, seat, spot, isMe, isTurn, isDealer, online, bid, won, cards, bidding }) {
  const line = bid == null ? (bidding && isTurn ? 'Bidding…' : '') : bidding ? `Bid ${bid}` : `Won ${won} of ${bid}`
  return (
    <div
      className="absolute flex w-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 sm:w-28"
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
    >
      <div className="relative">
        {isTurn && <span aria-hidden="true" className="absolute -inset-1.5 animate-pulse rounded-full ring-2 ring-accent" />}
        <Avatar name={player.name} seat={seat} />
        {!isMe && cards > 0 && (
          <span
            title={`${cards} cards`}
            className={`absolute top-0.5 h-8 w-6 rounded-md shadow ${spot.x > 60 ? '-left-6 -rotate-12' : '-right-6 rotate-12'}`}
          >
            <CardBack />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white">{cards}</span>
          </span>
        )}
        {player.bot ? (
          <span
            title="Bot"
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-raised text-accent"
          >
            <FaRobot className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        ) : (
          <span
            title={online ? 'Online' : 'Away'}
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${online ? 'bg-accent' : 'bg-faint'}`}
          />
        )}
        {isDealer && (
          <span
            title="Dealer"
            className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-extrabold text-slate-900"
          >
            D
          </span>
        )}
      </div>
      <p className={`max-w-full truncate text-xs font-bold ${isTurn ? 'text-accent' : 'text-ink'}`}>{isMe ? 'You' : player.name}</p>
      {line && <p className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-mute">{line}</p>}
      <span className="sr-only">
        {isMe ? 'You' : player.name}
        {isDealer ? ', dealer' : ''}
        {isTurn ? ', to play' : ''}
        {online ? '' : ', away'}
      </span>
    </div>
  )
}

