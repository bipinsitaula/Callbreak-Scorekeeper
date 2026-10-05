import { useEffect, useMemo, useState } from 'react'
import { FiLayers, FiRefreshCw, FiRotateCcw, FiZap } from 'react-icons/fi'
import { RiCoinsLine } from 'react-icons/ri'
import { FaRegLightbulb } from 'react-icons/fa'
import BackHome from '../components/BackHome'
import { CHIPS, MIN_BET, useBlackjackStore } from './store'
import { DECKS, basicStrategy, handValue, isNatural } from './engine'
import PlayingCard from './PlayingCard'

const fmt = (n) => n.toLocaleString()

const CHIP_STYLE = {
  10: 'bg-sky-600 text-white',
  50: 'bg-rose-600 text-white',
  100: 'bg-emerald-600 text-white',
  500: 'bg-violet-600 text-white',
}

function Chip({ value, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Add ${value} chips to your bet`}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full text-sm font-extrabold shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:h-16 sm:w-16 ${CHIP_STYLE[value]}`}
    >
      <span aria-hidden="true" className="absolute inset-1 rounded-full border-2 border-dashed border-white/70" />
      {value}
    </button>
  )
}

/** Short label for a hand's total: "17", "Soft 17", "Bust" or "Blackjack". */
const totalLabel = (cards, fromSplit = false) => {
  const { total, soft } = handValue(cards)
  if (total > 21) return 'Bust'
  if (!fromSplit && isNatural(cards)) return 'Blackjack'
  return soft && total < 21 ? `Soft ${total}` : String(total)
}

const OUTCOME_TEXT = {
  blackjack: 'Blackjack',
  win: 'Win',
  lose: 'Loss',
  bust: 'Bust',
  push: 'Push',
  surrender: 'Surrendered',
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-base/70 text-ink',
    good: 'bg-accent text-accent-ink',
    bad: 'bg-danger text-danger-ink',
  }
  return <span className={`rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${tones[tone]}`}>{children}</span>
}

function resultHeadline(result) {
  const { net, outcomes, insurance } = result
  const gain = `${net > 0 ? '+' : ''}${fmt(net)}`
  const side = insurance ? (insurance.paid ? ' Insurance paid 2 to 1.' : ' Insurance lost.') : ''
  if (outcomes.length === 1) {
    const o = outcomes[0]
    if (o === 'blackjack') return `Blackjack! ${gain}${side}`
    if (o === 'win') return `You win ${gain}${side}`
    if (o === 'push') return `Push. Your bet is returned.${side}`
    if (o === 'bust') return `Bust. You lose ${fmt(-net)}${side}`
    if (o === 'surrender') return `Surrendered. You lose ${fmt(-net)}${side}`
    return net === 0
      ? `Dealer wins, but your insurance covered it.${side}`
      : `Dealer wins. You lose ${fmt(-net)}${side}`
  }
  if (net > 0) return `Split hands: you win ${gain}${side}`
  if (net < 0) return `Split hands: you lose ${fmt(-net)}${side}`
  return `Split hands: you break even${side}`
}

export default function BlackjackTable() {
  const s = useBlackjackStore()
  const { phase, bankroll, bet, lastBet, dealer, hands, active, result, shoe, reshuffled, insurance } = s
  const [hint, setHint] = useState(null)

  const activeHand = hands[active]
  const inPlay = phase === 'player'
  const canDouble = inPlay && s.canDouble()
  const canSplit = inPlay && s.canSplit()
  const canSurrender = inPlay && s.canSurrender()
  const insuranceCost = phase === 'insurance' ? s.insuranceCost() : 0
  const broke = (phase === 'settled' || phase === 'betting') && bankroll < MIN_BET
  const shoeTotal = DECKS * 52
  const shoeLeft = Math.round((shoe.length / shoeTotal) * 100)

  // Reveal and draw the dealer's cards one at a time.
  useEffect(() => {
    if (phase !== 'dealer') return undefined
    const id = setTimeout(() => useBlackjackStore.getState().dealerStep(), dealer.holeHidden ? 500 : 750)
    return () => clearTimeout(id)
  }, [phase, dealer.holeHidden, dealer.cards.length])

  // A hint belongs to one decision; clear it when the hand changes.
  useEffect(() => setHint(null), [phase, active, activeHand?.cards.length, hands.length])

  const showHint = () => {
    if (!activeHand) return
    setHint(basicStrategy(activeHand.cards, dealer.cards[0], { canDouble, canSplit, canSurrender }))
  }

  // Keyboard: H hit, S stand, D double, P split, Enter deal / next hand.
  const act = useMemo(
    () => ({
      h: () => inPlay && s.hit(),
      s: () => inPlay && s.stand(),
      d: () => canDouble && s.double(),
      p: () => canSplit && s.split(),
      r: () => canSurrender && s.surrender(),
    }),
    [inPlay, canDouble, canSplit, canSurrender, s]
  )
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.target.closest?.('input, select, textarea')) return
      if (e.key === 'Enter' && !e.target.closest?.('button')) {
        if (phase === 'betting') s.deal()
        else if (phase === 'settled' && !broke) s.newRound()
        return
      }
      act[e.key.toLowerCase()]?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [act, phase, broke, s])

  const dealerCards = dealer.cards
  const dealerLabel = dealerCards.length
    ? dealer.holeHidden
      ? String(handValue([dealerCards[0]]).total)
      : totalLabel(dealerCards)
    : null

  const actionBtn = 'btn btn-secondary flex-1 sm:flex-none sm:min-w-[7rem]'

  return (
    <div className="space-y-6">
      <BackHome />

      <section
        className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-accent/15 via-surface to-surface p-4 shadow-panel sm:p-7"
        aria-label="Blackjack table"
      >
        {/* Status row */}
        <div className="mb-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-base/60 px-2 py-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-mute">
              <RiCoinsLine className="h-4 w-4 text-gold" aria-hidden="true" /> Chips
            </div>
            <div className="text-lg font-extrabold tabular-nums text-ink">{fmt(bankroll)}</div>
          </div>
          <div className="rounded-xl bg-base/60 px-2 py-2.5">
            <div className="text-xs font-bold text-mute">Bet</div>
            <div className="text-lg font-extrabold tabular-nums text-ink">
              {fmt(['player', 'dealer', 'insurance'].includes(phase) ? hands.reduce((n, h) => n + h.bet, 0) + insurance : bet)}
            </div>
          </div>
          <div className="rounded-xl bg-base/60 px-2 py-2.5">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-mute">
              <FiLayers className="h-4 w-4" aria-hidden="true" /> Shoe
            </div>
            <div className="text-lg font-extrabold tabular-nums text-ink">{shoeLeft}%</div>
          </div>
        </div>

        {/* Dealer */}
        <div className="min-h-[9rem]">
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-lg text-ink">Dealer</h2>
            {dealerLabel && <Badge>{dealerLabel}</Badge>}
          </div>
          <div className="flex min-h-[7rem] items-center">
            {dealerCards.length === 0 ? (
              <p className="text-mute">Place your bet to start the hand.</p>
            ) : (
              <div className="flex">
                {dealerCards.map((card, i) => (
                  <PlayingCard key={card.id} card={card} index={i} faceDown={i === 1 && dealer.holeHidden} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Result banner */}
        <div className="my-4 flex min-h-[3.25rem] items-center justify-center" aria-live="polite">
          {phase === 'settled' && result && (
            <p
              className={`rounded-2xl px-5 py-2.5 text-center text-lg font-extrabold ${
                result.net > 0
                  ? 'bg-accent/15 text-accent'
                  : result.net < 0
                    ? 'bg-danger/15 text-danger'
                    : 'bg-raised text-ink'
              }`}
            >
              {resultHeadline(result)}
            </p>
          )}
          {phase === 'dealer' && <p className="font-semibold text-mute">Dealer’s turn</p>}
          {reshuffled && phase === 'player' && (
            <p className="flex items-center gap-2 text-sm font-semibold text-mute">
              <FiRefreshCw className="h-4 w-4" aria-hidden="true" /> New shoe shuffled
            </p>
          )}
        </div>

        {/* Player hands */}
        <div className="min-h-[9rem]">
          <div className="flex flex-wrap gap-x-8 gap-y-5">
            {hands.map((hand, i) => {
              const isActive = inPlay && i === active
              const outcome = result?.outcomes[i]
              return (
                <div
                  key={i}
                  className={`rounded-2xl p-2 transition-shadow ${isActive && hands.length > 1 ? 'ring-2 ring-accent' : ''}`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg text-ink">{hands.length > 1 ? `Hand ${i + 1}` : 'You'}</h2>
                    <Badge tone={outcome ? (['win', 'blackjack'].includes(outcome) ? 'good' : outcome === 'push' ? 'neutral' : 'bad') : 'neutral'}>
                      {outcome ? `${totalLabel(hand.cards, hand.fromSplit)}, ${OUTCOME_TEXT[outcome]}` : totalLabel(hand.cards, hand.fromSplit)}
                    </Badge>
                    <span className="text-sm tabular-nums text-mute">
                      Bet {fmt(hand.bet)}
                      {hand.doubled && ' (doubled)'}
                    </span>
                  </div>
                  <div className="flex">
                    {hand.cards.map((card, ci) => (
                      <PlayingCard key={card.id} card={card} index={ci} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 border-t border-line pt-5">
          {phase === 'betting' && broke && (
            <div className="space-y-3 text-center">
              <p className="font-bold text-ink">You’re out of chips.</p>
              <button type="button" className="btn btn-primary" onClick={s.rebuy}>
                <FiZap className="h-4 w-4" aria-hidden="true" /> Get 1,000 new chips
              </button>
            </div>
          )}

          {phase === 'betting' && !broke && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {CHIPS.map((value) => (
                  <Chip key={value} value={value} disabled={bet + value > bankroll} onClick={() => s.addChip(value)} />
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" className="btn btn-secondary" onClick={s.clearBet} disabled={bet === 0}>
                  <FiRotateCcw className="h-4 w-4" aria-hidden="true" /> Clear bet
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => s.setBet(lastBet)}
                  disabled={lastBet > bankroll || bet === lastBet}
                >
                  Repeat last bet ({fmt(lastBet)})
                </button>
                <button type="button" className="btn btn-primary sm:min-w-[10rem]" onClick={s.deal} disabled={bet < MIN_BET}>
                  Deal
                </button>
              </div>
              <p className="text-center text-xs text-mute">Minimum bet {MIN_BET}. Press Enter to deal.</p>
            </div>
          )}

          {phase === 'insurance' && (
            <div className="mx-auto max-w-md space-y-4 text-center">
              <p className="font-bold text-ink">The dealer shows an ace. Want insurance?</p>
              <p className="text-sm text-mute">
                It costs {fmt(insuranceCost)} and pays 2 to 1 if the dealer has blackjack. Strategy guides say to
                decline it, because it loses more often than it wins.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" className="btn btn-primary" onClick={() => s.resolveInsurance(false)}>
                  No insurance
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => s.resolveInsurance(true)}
                  disabled={bankroll < insuranceCost}
                >
                  Take insurance ({fmt(insuranceCost)})
                </button>
              </div>
            </div>
          )}

          {phase === 'player' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn btn-primary flex-1 sm:flex-none sm:min-w-[7rem]" onClick={s.hit}>
                  Hit
                </button>
                <button type="button" className={actionBtn} onClick={s.stand}>
                  Stand
                </button>
                <button type="button" className={actionBtn} onClick={s.double} disabled={!canDouble}>
                  Double
                </button>
                <button type="button" className={actionBtn} onClick={s.split} disabled={!canSplit}>
                  Split
                </button>
                <button type="button" className={actionBtn} onClick={s.surrender} disabled={!canSurrender}>
                  Surrender
                </button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button type="button" className="btn btn-ghost !min-h-0 !py-1.5" onClick={showHint}>
                  <FaRegLightbulb className="h-4 w-4 text-gold" aria-hidden="true" /> Get a hint
                </button>
                {hint && (
                  <p className="max-w-md rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-center text-sm text-ink" role="status">
                    <strong className="capitalize">{hint.action}.</strong> {hint.reason}
                  </p>
                )}
                <p className="text-xs text-mute">Shortcuts: H hit, S stand, D double, P split, R surrender.</p>
              </div>
            </div>
          )}

          {phase === 'dealer' && <p className="py-3 text-center text-mute">Hang on, the dealer is playing.</p>}

          {phase === 'settled' &&
            (broke ? (
              <div className="space-y-3 text-center">
                <p className="font-bold text-ink">You’re out of chips.</p>
                <button type="button" className="btn btn-primary" onClick={s.rebuy}>
                  <FiZap className="h-4 w-4" aria-hidden="true" /> Get 1,000 new chips
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button type="button" className="btn btn-primary sm:min-w-[12rem]" onClick={s.newRound}>
                  Next hand
                </button>
              </div>
            ))}
        </div>
      </section>

      <p className="px-1 text-center text-xs text-mute">
        Cards come from a {DECKS}-deck shoe shuffled with your browser’s secure random generator, so there is no pattern to find. Play money only.
      </p>
    </div>
  )
}
