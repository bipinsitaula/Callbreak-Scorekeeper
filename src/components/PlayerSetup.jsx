import { useEffect, useId, useRef, useState } from 'react'
import { FiBox, FiCheck, FiChevronDown, FiInfo, FiPlay, FiSettings, FiShuffle, FiUsers } from 'react-icons/fi'
import { FaCrown } from 'react-icons/fa'
import { RiDraggable } from 'react-icons/ri'
import { LuRefreshCw } from 'react-icons/lu'
import { GiSpades } from 'react-icons/gi'
import { useGameStore } from '../store'
import { useToastStore } from '../hooks/useToast'
import { getCardsPerPlayer, getMaxBid, isGameComplete, getRemainingCards, getVariantNotes } from '../utils/helpers'
import Avatar from './Avatar'
import CardArt from './CardArt'
import ConfirmDialog from './ConfirmDialog'

const PLAYER_COUNTS = [2, 3, 4, 5]
const ROUND_OPTIONS = [
  { value: 5, hint: 'Traditional' },
  { value: 7, hint: '' },
  { value: 10, hint: '' },
  { value: 13, hint: 'Long' },
]

const defaultNames = (count) => Array.from({ length: count }, (_, i) => `Player ${i + 1}`)

function Segmented({ label, options, value, onChange, outline = false }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-3">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`seg ${outline ? 'seg-outline' : ''}`}
          >
            <span className="block text-lg leading-tight tabular-nums">{opt.value}</span>
            {opt.hint && <span className="block text-[11px] font-medium leading-tight opacity-80">{opt.hint}</span>}
            {selected && (
              <span
                aria-hidden="true"
                className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full ${
                  outline ? 'bg-accent text-accent-ink' : 'bg-accent-ink text-accent'
                }`}
              >
                <FiCheck className="h-3 w-3" strokeWidth={3.5} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function PlayerSetup() {
  const initializeGame = useGameStore((s) => s.initializeGame)
  // A finished game is already archived, so only a game still being played needs a replace warning.
  const inProgress = useGameStore((s) => s.started && !isGameComplete(s.currentRound, s.totalRounds))
  const prefs = useGameStore((s) => s.prefs)
  const { error } = useToastStore()
  const formId = useId()

  // Pre-fill with the last used table so a rematch is one tap.
  const [playerCount, setPlayerCount] = useState(prefs?.playerCount ?? 4)
  const [playerNames, setPlayerNames] = useState(prefs?.playerNames ?? defaultNames(prefs?.playerCount ?? 4))
  const [totalRounds, setTotalRounds] = useState(
    ROUND_OPTIONS.some((o) => o.value === prefs?.totalRounds) ? prefs.totalRounds : 5
  )
  const [dealer, setDealer] = useState('random')
  const [pending, setPending] = useState(null) // validated settings awaiting "replace current game?" confirmation
  const [dragFrom, setDragFrom] = useState(null)
  const [focusSeat, setFocusSeat] = useState(null)
  const handles = useRef([])

  useEffect(() => {
    if (focusSeat !== null) handles.current[focusSeat]?.focus()
  }, [focusSeat, playerNames])

  const cardsPerPlayer = getCardsPerPlayer(playerCount)
  const remainingCards = getRemainingCards(playerCount)

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count)
    // Keep names already typed; fill any new seats with defaults.
    setPlayerNames((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? `Player ${i + 1}`))
    setDealer('random')
  }

  const handleNameChange = (index, value) =>
    setPlayerNames((prev) => prev.map((n, i) => (i === index ? value : n)))

  // Move a seat, keeping a manually chosen dealer attached to the same player.
  const moveSeat = (from, to) => {
    if (to < 0 || to >= playerNames.length || from === to) return
    setPlayerNames((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setDealer((d) => {
      if (d === 'random') return d
      if (d === from) return to
      if (from < to && d > from && d <= to) return d - 1
      if (from > to && d >= to && d < from) return d + 1
      return d
    })
  }

  const handleShuffle = () => {
    setPlayerNames((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[next[i], next[j]] = [next[j], next[i]]
      }
      return next
    })
    setDealer('random')
  }

  const trimmed = playerNames.map((n) => n.trim())
  const lowered = trimmed.map((n) => n.toLowerCase())
  const isDuplicate = (i) => trimmed[i] !== '' && lowered.indexOf(lowered[i]) !== lowered.lastIndexOf(lowered[i])

  const begin = (settings) =>
    initializeGame(settings.playerCount, settings.names, settings.totalRounds, settings.dealerStart)

  const handleSubmit = (e) => {
    e.preventDefault()
    const emptyIdx = trimmed.findIndex((n) => !n)
    if (emptyIdx !== -1) return error(`Enter a name for Player ${emptyIdx + 1}.`)
    if (new Set(lowered).size !== lowered.length) return error('Two players share a name. Each name must be unique.')

    const settings = {
      playerCount,
      names: trimmed,
      totalRounds,
      dealerStart: dealer === 'random' ? Math.floor(Math.random() * playerCount) : dealer,
    }
    if (inProgress) setPending(settings)
    else begin(settings)
  }

  return (
    <div className="space-y-6">
      <section className="hero">
        <CardArt className="absolute -right-6 -top-2 hidden h-52 w-80 sm:block" />
        <div className="relative max-w-xl">
          <h1 className="flex items-center gap-3 text-3xl text-ink sm:text-4xl">
            <GiSpades className="h-10 w-10 flex-shrink-0 text-accent sm:h-12 sm:w-12" aria-hidden="true" />
            <span>
              Call Break <span className="text-accent">Scorekeeper</span>
            </span>
          </h1>
          <p className="mt-3 text-base text-mute sm:text-lg">
            A companion for your physical card game. Track bids, tricks and victories — works offline.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel" noValidate>
        <header className="mb-6 flex items-center gap-4 border-b border-line pb-6">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-line bg-raised text-ink">
            <FiSettings className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-2xl text-ink">Game Setup</h2>
            <p className="text-mute">Configure your players and begin the round.</p>
          </div>
        </header>

        <div className="space-y-7">
          <div>
            <span className="label mb-3">
              <FiUsers className="h-5 w-5" aria-hidden="true" />
              Number of players
            </span>
            <Segmented
              label="Number of players"
              options={PLAYER_COUNTS.map((value) => ({ value }))}
              value={playerCount}
              onChange={handlePlayerCountChange}
            />
          </div>

          <div className="flex gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <FiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-ink">
              <strong className="text-accent">Setup:</strong> {getVariantNotes(playerCount)}
              <br />
              <span className="text-mute">
                Cards per player: <strong className="text-ink">{cardsPerPlayer}</strong>
                {remainingCards > 0 && ` (${remainingCards} set aside)`}. Bid range:{' '}
                <strong className="text-ink">1–{getMaxBid(playerCount)}</strong>.
              </span>
            </p>
          </div>

          <fieldset>
            <div className="mb-3 flex items-center justify-between gap-3">
              <legend className="label">
                <FiUsers className="h-5 w-5" aria-hidden="true" />
                Players (in seating order)
              </legend>
              <button type="button" onClick={handleShuffle} className="btn btn-ghost !min-h-0 flex-shrink-0 whitespace-nowrap !px-2 !py-1.5">
                <FiShuffle className="h-4 w-4" aria-hidden="true" />
                Shuffle seats
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {playerNames.map((name, idx) => (
                <div
                  key={idx}
                  onDragOver={(e) => dragFrom !== null && e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom !== null) moveSeat(dragFrom, idx)
                    setDragFrom(null)
                  }}
                  className={`rounded-xl border bg-raised/40 p-2 transition-colors ${
                    dragFrom === idx ? 'border-accent/60 opacity-60' : 'border-line'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar seat={idx} label={`P${idx + 1}`} />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`${formId}-name-${idx}`} className="sr-only">
                        Player {idx + 1} name
                      </label>
                      <input
                        id={`${formId}-name-${idx}`}
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        placeholder={`Player ${idx + 1}`}
                        maxLength={20}
                        autoComplete="off"
                        aria-invalid={isDuplicate(idx)}
                        aria-describedby={isDuplicate(idx) ? `${formId}-dup-${idx}` : undefined}
                        className={`field h-10 w-full !py-0 ${isDuplicate(idx) ? '!border-danger' : ''}`}
                      />
                    </div>
                    <button
                      type="button"
                      ref={(el) => (handles.current[idx] = el)}
                      draggable
                      onDragStart={() => setDragFrom(idx)}
                      onDragEnd={() => setDragFrom(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                          e.preventDefault()
                          const to = idx + (e.key === 'ArrowUp' ? -1 : 1)
                          moveSeat(idx, to)
                          setFocusSeat(Math.min(Math.max(to, 0), playerNames.length - 1))
                        }
                      }}
                      aria-label={`Move ${name || `Player ${idx + 1}`}: drag, or press the up and down arrow keys`}
                      className="flex h-10 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-lg text-faint hover:text-ink active:cursor-grabbing"
                    >
                      <RiDraggable className="h-5 w-5" />
                    </button>
                  </div>
                  {isDuplicate(idx) && (
                    <p id={`${formId}-dup-${idx}`} className="mt-1.5 px-1 text-xs text-danger">
                      This name is already used.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <label htmlFor={`${formId}-dealer`} className="label mb-3">
                <FaCrown className="h-5 w-5" aria-hidden="true" />
                First dealer
              </label>
              <div className="relative">
                <FiBox className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" aria-hidden="true" />
                <select
                  id={`${formId}-dealer`}
                  value={dealer}
                  onChange={(e) => setDealer(e.target.value === 'random' ? 'random' : parseInt(e.target.value, 10))}
                  className="field h-14 w-full appearance-none !pl-12 !pr-10"
                >
                  <option value="random">Random</option>
                  {trimmed.map((n, i) => (
                    <option key={i} value={i}>{n || `Player ${i + 1}`}</option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" aria-hidden="true" />
              </div>
            </div>
            <div>
              <span className="label mb-3">
                <LuRefreshCw className="h-5 w-5" aria-hidden="true" />
                Total rounds
              </span>
              <Segmented label="Total rounds" options={ROUND_OPTIONS} value={totalRounds} onChange={setTotalRounds} outline />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block !min-h-[3.5rem] text-base">
            <FiPlay className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            Start Game
          </button>
        </div>
      </form>

      {pending && (
        <ConfirmDialog
          title="Replace the current game?"
          message="A game is already in progress. Starting a new one discards its scores."
          confirmLabel="Start new game"
          onConfirm={() => {
            begin(pending)
            setPending(null)
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
