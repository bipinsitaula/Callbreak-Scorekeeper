import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiCheck, FiChevronLeft, FiEyeOff } from 'react-icons/fi'
import Modal from '../components/Modal'
import { CardFace } from '../blackjack/PlayingCard'
import { SUITS } from '../blackjack/engine'

const SUIT_ORDER = ['spades', 'hearts', 'clubs', 'diamonds']
const SUIT = Object.fromEntries(SUITS.map((s) => [s.id, s]))

/**
 * Pop-up for your bid: your cards, the bids so far, a number picker and a confirm step.
 * "Hide" tucks it away so you can study your full hand; a button brings it back.
 */
export default function BidDialog({ max, hand, players, bids, mySeat, onBid }) {
  const [value, setValue] = useState(null)
  const [step, setStep] = useState('pick') // 'pick' | 'confirm'
  const [hidden, setHidden] = useState(false)
  const [sending, setSending] = useState(false)

  const confirmBid = async () => {
    setSending(true)
    const ok = await onBid(value)
    setSending(false)
    if (!ok) setStep('pick')
  }

  if (hidden) {
    return (
      <div className="mb-2 flex justify-center">
        <motion.button
          type="button"
          className="btn btn-primary sm:min-w-[12rem]"
          onClick={() => setHidden(false)}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          Place your bid
        </motion.button>
      </div>
    )
  }

  const made = players.map((p, i) => ({ name: i === mySeat ? 'You' : p.name, bid: bids[i] })).filter((b) => b.bid != null)
  const spades = hand.filter((c) => c.suit === 'spades').length

  return (
    <Modal
      onClose={() => setHidden(true)}
      labelledBy="bid-title"
      className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
    >
      {step === 'pick' ? (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="bid-title" className="text-xl text-ink">
                Your bid
              </h2>
              <p className="text-sm text-mute">How many tricks will you win this round?</p>
            </div>
            <button type="button" className="btn btn-ghost !min-h-0 flex-shrink-0 !px-3 !py-2" onClick={() => setHidden(true)}>
              <FiEyeOff className="h-4 w-4" aria-hidden="true" /> Hide
            </button>
          </div>

          {/* Your hand, grouped by suit */}
          <div className="mb-2 flex flex-wrap justify-center gap-x-3 gap-y-4 rounded-xl bg-raised/60 px-2 pb-3 pt-5" aria-label="Your cards">
            {SUIT_ORDER.map((suit) => {
              const cards = hand.filter((c) => c.suit === suit)
              if (!cards.length) return null
              return (
                <div key={suit} className="flex">
                  {cards.map((card, i) => (
                    <motion.div
                      key={card.id}
                      role="img"
                      aria-label={`${card.rank} of ${card.suit}`}
                      whileHover={{ y: -10, scale: 1.25, zIndex: 30 }}
                      whileTap={{ y: -10, scale: 1.25, zIndex: 30 }}
                      animate={{ zIndex: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      style={{ originY: 1 }}
                      className={`relative h-[4.25rem] w-12 flex-shrink-0 rounded-lg shadow-md sm:h-20 sm:w-14 ${i ? '-ml-7 sm:-ml-8' : ''}`}
                    >
                      <CardFace card={card} small />
                    </motion.div>
                  ))}
                </div>
              )
            })}
          </div>
          <p className="mb-4 text-center text-xs text-mute">
            {SUIT.spades.symbol} Spades are trump; you hold {spades}. Hover or press a card to see it bigger.
          </p>

          {made.length > 0 && (
            <p className="mb-4 text-center text-sm text-mute">
              Bids so far:{' '}
              {made.map((b, i) => (
                <span key={b.name}>
                  {i > 0 && ', '}
                  <strong className="text-ink">{b.name}</strong> {b.bid}
                </span>
              ))}
            </p>
          )}

          <div role="radiogroup" aria-label="Your bid" className="flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: max }, (_, i) => i + 1).map((b) => (
              <button
                key={b}
                type="button"
                role="radio"
                aria-checked={value === b}
                onClick={() => setValue(b)}
                className={`h-11 min-w-[2.75rem] rounded-xl px-2 text-base font-extrabold tabular-nums transition-colors ${
                  value === b ? 'bg-accent text-accent-ink shadow-glow' : 'border border-line bg-raised text-ink hover:border-accent/60'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary mt-5 w-full" disabled={value === null} onClick={() => setStep('confirm')}>
            {value ? `Bid ${value}` : 'Pick a number'}
          </button>
        </>
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-3xl font-extrabold tabular-nums text-accent">
            {value}
          </div>
          <h2 id="bid-title" className="mb-2 text-2xl text-ink">
            Bid {value}?
          </h2>
          <p className="mb-6 text-mute">
            Win at least {value} trick{value > 1 ? 's' : ''} to score +{value}.0 (each extra trick adds 0.1). Win fewer and you lose {value}. You
            can’t change your bid once it’s placed.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn btn-primary flex-1" onClick={confirmBid} disabled={sending}>
              <FiCheck className="h-4 w-4" aria-hidden="true" /> Confirm bid
            </button>
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setStep('pick')} disabled={sending}>
              <FiChevronLeft className="h-4 w-4" aria-hidden="true" /> Change
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
