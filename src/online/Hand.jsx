import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { CARD_SIZE, CardFace } from '../blackjack/PlayingCard'
import { SUITS } from '../blackjack/engine'

const SUIT = Object.fromEntries(SUITS.map((s) => [s.id, s]))
const LIFT_ROOM = 28 // px above the cards so lifted ones aren't clipped

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

function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const cardName = (card) => `${card.rank}${SUIT[card.suit].symbol}`

/** Why the cards you can't play are off limits, from the cards you can. */
const legalHint = (cards, playable, ledSuit) => {
  const legal = cards.filter((c) => playable.has(c.id))
  if (!ledSuit || legal.length === cards.length) return 'You can’t play that card.'
  if (legal.every((c) => c.suit === ledSuit)) return `You must play ${ledSuit}${legal.length < cards.filter((c) => c.suit === ledSuit).length ? ', a higher one' : ''}.`
  if (legal.every((c) => c.suit === 'spades')) return `No ${ledSuit} left, so you must play a spade${legal.length < cards.filter((c) => c.suit === 'spades').length ? ', a higher one' : ''}.`
  return 'You can’t play that card.'
}

/**
 * Your cards. With a mouse: hover to enlarge, click to play. On a touch screen: big hands
 * split into two rows, a tap (or sliding your finger along the cards) picks a card and lifts
 * it, and a second tap or the Play button plays it, so a slip never plays the wrong card.
 */
export default function Hand({ cards, playable, onPlay, dealId, ledSuit }) {
  const ref = useRef(null)
  const { w } = useSize(ref)
  const smUp = useMedia('(min-width: 640px)')
  const touch = useMedia('(pointer: coarse)')
  const [selected, setSelected] = useState(null)
  const sliding = useRef(false)
  const slidAt = useRef(0) // when a slide last moved the selection; the click that follows is ignored

  // Cards fan in one after another when the hand first appears; later moves are immediate.
  const intro = useRef(true)
  useEffect(() => {
    intro.current = true
    const id = setTimeout(() => {
      intro.current = false
    }, 1000)
    return () => clearTimeout(id)
  }, [dealId])

  // Drop the selection when that card leaves the hand or the turn changes.
  const myTurn = Boolean(playable)
  useEffect(() => setSelected(null), [myTurn, dealId])
  useEffect(() => {
    if (selected && !cards.some((c) => c.id === selected)) setSelected(null)
  }, [cards, selected])

  /* ----- Layout: one fanned row, or two rows on a narrow touch screen ----- */
  const cardW = smUp ? 80 : 62.4
  const cardH = smUp ? 112 : 88
  const twoRows = !smUp && cards.length > 7
  const split = twoRows ? Math.ceil(cards.length / 2) : cards.length
  const rows = twoRows ? [cards.slice(0, split), cards.slice(split)] : [cards]
  const rowGap = twoRows ? Math.round(cardH * 0.62) : 0
  const maxStep = cardW * (twoRows ? 0.78 : 0.6)
  const positions = {}
  rows.forEach((row, r) => {
    const step = row.length > 1 ? Math.max(10, Math.min(maxStep, (w - cardW) / (row.length - 1))) : 0
    const start = (w - (cardW + step * (row.length - 1))) / 2
    row.forEach((card, j) => {
      positions[card.id] = { x: start + j * step, y: r * rowGap, z: r * 50 + j + 1 }
    })
  })
  // A picked card lifts and grows on touch screens, so it needs more headroom.
  const top = touch ? LIFT_ROOM + 14 : LIFT_ROOM
  const height = top + cardH + rowGap * (rows.length - 1)

  const selectedCard = cards.find((c) => c.id === selected)
  const isLegal = (card) => !playable || playable.has(card.id)

  const choose = (id) => {
    if (id === selected) return
    setSelected(id)
    navigator.vibrate?.(8)
  }

  const onCardClick = (card) => {
    if (Date.now() - slidAt.current < 400) return // the finger slid here; that already picked the card
    const active = Boolean(playable) && isLegal(card)
    if (!touch) {
      if (active) onPlay(card)
      return
    }
    if (selected === card.id && active) onPlay(card)
    else choose(card.id)
  }

  // Sliding a finger along the hand moves the selection to the card under it.
  const cardAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-card-id]')?.dataset.cardId
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch') return
    sliding.current = true
  }
  const onPointerMove = (e) => {
    if (!sliding.current) return
    const id = cardAt(e.clientX, e.clientY)
    if (id && id !== selected) {
      slidAt.current = Date.now()
      choose(id)
    }
  }
  const endSlide = () => {
    sliding.current = false
  }

  return (
    <div>
      {/* Touch: what's picked and the Play button */}
      {touch && (
        <div className="flex min-h-[3.25rem] items-center justify-center gap-2 px-1" aria-live="polite">
          {selectedCard ? (
            <>
              <span className={`text-xl font-extrabold ${SUIT[selectedCard.suit].red ? 'text-red-500' : 'text-ink'}`}>{cardName(selectedCard)}</span>
              {playable && isLegal(selectedCard) ? (
                <button type="button" className="btn btn-primary !min-h-[2.75rem] flex-1 sm:flex-none sm:min-w-[10rem]" onClick={() => onPlay(selectedCard)}>
                  Play {cardName(selectedCard)}
                </button>
              ) : (
                <p className={`flex-1 text-sm font-semibold ${playable ? 'text-danger' : 'text-mute'}`}>
                  {playable ? legalHint(cards, playable, ledSuit) : 'Not your turn yet.'}
                </p>
              )}
              <button type="button" aria-label="Deselect card" onClick={() => setSelected(null)} className="rounded-lg p-2.5 text-mute hover:bg-raised hover:text-ink">
                <FiX className="h-5 w-5" />
              </button>
            </>
          ) : (
            <p className="text-sm font-semibold text-mute">
              {playable ? 'Tap or slide to pick a raised card, then tap Play.' : 'Tap a card to see it bigger.'}
            </p>
          )}
        </div>
      )}

      <div
        ref={ref}
        // `isolate` keeps the cards' z-index layering inside the hand, below pop-ups and the chat.
        className="relative isolate select-none"
        style={{ height, touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSlide}
        onPointerCancel={endSlide}
      >
        <AnimatePresence initial>
          {w > 0 &&
            cards.map((card, i) => {
              const legal = isLegal(card)
              const active = Boolean(playable) && legal
              const picked = selected === card.id
              const pos = positions[card.id]
              const lift = picked ? -26 : active ? -10 : 0
              return (
                <motion.button
                  key={`${dealId}-${card.id}`}
                  data-card-id={card.id}
                  type="button"
                  // Not `disabled`: disabled buttons get no hover events, and every card should zoom.
                  aria-disabled={!active}
                  aria-pressed={touch ? picked : undefined}
                  onClick={() => onCardClick(card)}
                  initial={{ opacity: 0, x: pos.x, y: pos.y + 40, rotate: -4 }}
                  animate={{
                    opacity: 1,
                    x: pos.x,
                    y: pos.y + lift,
                    rotate: 0,
                    scale: picked ? 1.14 : 1,
                    zIndex: picked ? 200 : pos.z,
                  }}
                  exit={{ opacity: 0, y: pos.y - 80, scale: 0.85, transition: { duration: 0.2 } }}
                  whileHover={touch ? undefined : { y: pos.y + (active ? -26 : -16), scale: 1.18, zIndex: 200 }}
                  whileFocus={touch ? undefined : { y: pos.y + (active ? -26 : -16), scale: 1.18, zIndex: 200 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30, delay: intro.current ? Math.min(i, 26) * 0.025 : 0 }}
                  style={{ top, left: 0, originY: 1 }}
                  className={`absolute rounded-xl shadow-lg ${CARD_SIZE} ${picked ? 'ring-4 ring-accent' : ''} ${
                    playable && !legal ? 'cursor-not-allowed brightness-[0.55]' : active ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  aria-label={`${card.rank} of ${card.suit}${playable ? (legal ? '' : ', cannot be played') : ''}`}
                >
                  <CardFace card={card} />
                </motion.button>
              )
            })}
        </AnimatePresence>
      </div>
    </div>
  )
}
