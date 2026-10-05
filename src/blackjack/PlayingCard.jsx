import { motion } from 'framer-motion'
import { SUITS } from './engine'

const SYMBOL = Object.fromEntries(SUITS.map((s) => [s.id, s]))

/** A single playing card. `faceDown` shows the back. Cards slide in when first dealt. */
export default function PlayingCard({ card, faceDown = false, index = 0 }) {
  const suit = card ? SYMBOL[card.suit] : null
  const size = 'h-[5.5rem] w-[3.9rem] sm:h-28 sm:w-20'

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -24, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, delay: Math.min(index, 3) * 0.04 }}
      className={`relative flex-shrink-0 select-none rounded-xl shadow-lg ${size} ${index > 0 ? '-ml-8 sm:-ml-10' : ''}`}
      role="img"
      aria-label={faceDown ? 'Face-down card' : `${card.rank} of ${card.suit}`}
    >
      {faceDown ? (
        <div className="h-full w-full rounded-xl border-2 border-white/80 bg-[#0d2a3a] p-1">
          <div
            className="h-full w-full rounded-lg border border-accent/60"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgb(45 226 166 / 0.35) 0 2px, transparent 2px 9px), repeating-linear-gradient(-45deg, rgb(45 226 166 / 0.35) 0 2px, transparent 2px 9px)',
            }}
          />
        </div>
      ) : (
        <div
          className={`flex h-full w-full flex-col justify-between rounded-xl border border-slate-300 bg-white p-1.5 sm:p-2 ${
            suit.red ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          <div className="flex flex-col items-start leading-none">
            <span className="text-base font-extrabold sm:text-xl">{card.rank}</span>
            <span className="text-sm sm:text-lg">{suit.symbol}</span>
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-3xl sm:text-5xl" aria-hidden="true">
            {suit.symbol}
          </span>
          <div className="flex rotate-180 flex-col items-start leading-none">
            <span className="text-base font-extrabold sm:text-xl">{card.rank}</span>
            <span className="text-sm sm:text-lg">{suit.symbol}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
