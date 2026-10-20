import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CardBack } from '../blackjack/PlayingCard'
import { MINI_CARD, seatOffset } from './layout'

const STACK = 14 // cards drawn in the shuffling deck
const RIFFLE_S = 0.5
const RIFFLES = 3
const SHUFFLE_MS = RIFFLE_S * RIFFLES * 1000 + 350

/**
 * Riffle-shuffles a deck in the middle of the table, then deals it one card at a time
 * clockwise from the dealer's left. Calls `onDone` when the last card lands.
 * `size` is the felt's measured size, so cards fly to where each seat really is.
 */
export default function DealAnimation({ players, dealer, mySeat, cardsEach, size, onDone }) {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState(reduce ? 'done' : 'shuffle')
  const n = players
  const total = n * cardsEach
  const step = Math.min(0.055, 2.2 / total) // seconds between cards

  useEffect(() => {
    if (stage === 'done') {
      onDone()
      return undefined
    }
    const ms = stage === 'shuffle' ? SHUFFLE_MS : (total * step + 0.55) * 1000
    const id = setTimeout(() => setStage(stage === 'shuffle' ? 'deal' : 'done'), ms)
    return () => clearTimeout(id)
  }, [stage, total, step, onDone])

  if (stage === 'done') return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-live="polite">
      <p className="absolute inset-x-0 top-[62%] text-center text-sm font-bold text-mute">
        {stage === 'shuffle' ? 'Shuffling…' : 'Dealing…'}
      </p>
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {stage === 'shuffle' ? <Riffle /> : <Deal n={n} dealer={dealer} mySeat={mySeat} total={total} step={step} size={size} />}
      </div>
    </div>
  )
}

/** The deck splits into two halves that fan out and interleave back together, a few times. */
function Riffle() {
  return Array.from({ length: STACK }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const lift = -i * 0.7
    return (
      <motion.div
        key={i}
        className={`absolute rounded-xl shadow-lg ${MINI_CARD}`}
        initial={{ x: 0, y: lift, rotate: 0 }}
        animate={{
          x: [0, side * 34, side * 34, 0],
          y: [lift, lift - 6, lift + 2, lift],
          rotate: [0, side * -12, side * -4, 0],
        }}
        transition={{
          duration: RIFFLE_S,
          times: [0, 0.35, 0.65, 1],
          ease: 'easeInOut',
          repeat: RIFFLES - 1,
          // Cards fall back in alternating from the two halves, bottom first.
          delay: (STACK - i) * 0.008,
        }}
      >
        <CardBack />
      </motion.div>
    )
  })
}

function Deal({ n, dealer, mySeat, total, step, size }) {
  return (
    <>
      {/* What is left of the deck shrinks away as it is dealt. */}
      <motion.div
        className={`absolute rounded-xl shadow-lg ${MINI_CARD}`}
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: total * step, ease: 'linear' }}
      >
        <CardBack />
      </motion.div>
      {Array.from({ length: total }, (_, i) => {
        const seat = (dealer + 1 + i) % n
        const to = seatOffset(seat, mySeat, n, size, seat === mySeat ? 1.25 : 0.8)
        const tilt = ((i * 37) % 21) - 10
        return (
          <motion.div
            key={i}
            className={`absolute rounded-xl shadow-lg ${MINI_CARD}`}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
            animate={{ x: to.x, y: to.y, rotate: tilt, opacity: 1 }}
            transition={{ delay: i * step, duration: 0.32, ease: [0.2, 0.7, 0.3, 1] }}
          >
            <CardBack />
          </motion.div>
        )
      })}
    </>
  )
}
