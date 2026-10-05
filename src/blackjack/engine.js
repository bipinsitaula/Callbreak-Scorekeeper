/**
 * Blackjack rules engine: pure functions, no React, no storage.
 *
 * Rules implemented: 6-deck shoe, dealer stands on all 17s, blackjack pays 3:2,
 * double on any two cards (also after a split), one split per round (split aces
 * receive one card each), insurance (2:1) when the dealer shows an ace, and late
 * surrender (half the bet back) as a first decision.
 */

export const SUITS = [
  { id: 'spades', symbol: '♠', red: false },
  { id: 'hearts', symbol: '♥', red: true },
  { id: 'diamonds', symbol: '♦', red: true },
  { id: 'clubs', symbol: '♣', red: false },
]
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const DECKS = 6
export const RESHUFFLE_AT = 0.25 // reshuffle once fewer than 25% of the shoe is left
export const MIN_BET = 10
export const START_BANKROLL = 1000
export const CHIPS = [10, 50, 100, 500]

/* ---------- Randomness ---------- */

/**
 * Uniform integer in [0, max) from the browser's cryptographic generator.
 * Rejection sampling removes modulo bias, so every value is exactly equally likely.
 */
export const secureRandomInt = (max) => {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / max) * max
  let x
  do {
    globalThis.crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

/** Fisher–Yates shuffle (returns a new array). Every permutation is equally likely. */
export const shuffle = (cards, randInt = secureRandomInt) => {
  const out = [...cards]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const buildShoe = (decks = DECKS) => {
  const cards = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ id: `${d}-${suit.id}-${rank}`, rank, suit: suit.id })
    }
  }
  return cards
}

export const createShoe = (decks = DECKS, randInt = secureRandomInt) => shuffle(buildShoe(decks), randInt)

export const needsReshuffle = (shoeLength, decks = DECKS) => shoeLength < decks * 52 * RESHUFFLE_AT

/* ---------- Hands ---------- */

export const cardValue = (rank) => {
  if (rank === 'A') return 11
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return parseInt(rank, 10)
}

/** Best total for a hand; `soft` means an ace is currently counted as 11. */
export const handValue = (cards) => {
  let total = cards.reduce((sum, c) => sum + cardValue(c.rank), 0)
  let aces = cards.filter((c) => c.rank === 'A').length
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return { total, soft: aces > 0 }
}

export const isBust = (cards) => handValue(cards).total > 21
export const isNatural = (cards) => cards.length === 2 && handValue(cards).total === 21
export const canSplitCards = (cards) => cards.length === 2 && cardValue(cards[0].rank) === cardValue(cards[1].rank)

export const suitSymbol = (suitId) => SUITS.find((s) => s.id === suitId)?.symbol ?? ''
export const cardLabel = (card) => `${card.rank}${suitSymbol(card.suit)}`

/* ---------- Settlement ---------- */

/**
 * Result of one player hand against the dealer's final hand.
 * `hand.bet` is the total staked on the hand (already doubled if it was doubled).
 * `payout` is what returns to the bankroll (stake included), in chips.
 */
export const settleHand = (hand, dealerCards) => {
  const player = handValue(hand.cards).total
  const dealer = handValue(dealerCards).total
  const playerNatural = !hand.fromSplit && isNatural(hand.cards)
  const dealerNatural = isNatural(dealerCards)
  const stake = hand.bet

  if (hand.surrendered) return { outcome: 'surrender', payout: stake / 2 }
  if (player > 21) return { outcome: 'bust', payout: 0 }
  if (playerNatural && dealerNatural) return { outcome: 'push', payout: stake }
  if (playerNatural) return { outcome: 'blackjack', payout: stake * 2.5 }
  if (dealerNatural) return { outcome: 'lose', payout: 0 }
  if (dealer > 21 || player > dealer) return { outcome: 'win', payout: stake * 2 }
  if (player < dealer) return { outcome: 'lose', payout: 0 }
  return { outcome: 'push', payout: stake }
}

/* ---------- Basic-strategy guidance (6 decks, dealer stands on 17) ---------- */

const upValue = (card) => cardValue(card.rank)

/**
 * Recommended action for the current hand.
 * Returns { action: 'hit' | 'stand' | 'double' | 'split' | 'surrender', reason }.
 */
export const basicStrategy = (cards, dealerUp, { canDouble, canSplit, canSurrender = false }) => {
  const up = upValue(dealerUp)
  const { total, soft } = handValue(cards)
  const say = (action, reason) => ({ action, reason })
  const between = (lo, hi) => up >= lo && up <= hi

  // Pairs
  if (canSplit && canSplitCards(cards)) {
    const r = cardValue(cards[0].rank)
    if (r === 11) return say('split', 'Always split aces: each one starts a strong hand.')
    if (r === 8) return say('split', 'Always split 8s: 16 is the worst hand to play as one.')
    if (r === 9 && up !== 7 && up < 10) return say('split', 'Split 9s against this card; two hands of 9 beat one 18.')
    if (r === 7 && up <= 7) return say('split', 'Split 7s while the dealer is weak.')
    if (r === 6 && up <= 6) return say('split', 'Split 6s while the dealer is likely to bust.')
    if ((r === 3 || r === 2) && up <= 7) return say('split', 'Split small pairs against a 7 or lower.')
    if (r === 4 && between(5, 6)) return say('split', 'Split 4s only against a 5 or 6.')
  }

  if (soft && total <= 21) {
    if (total >= 19) return say('stand', `Soft ${total} is strong. Stand.`)
    if (total === 18) {
      if (between(3, 6) && canDouble) return say('double', 'Soft 18 against a weak dealer: double.')
      if (up <= 8) return say('stand', 'Soft 18 stands against a 2 to 8.')
      return say('hit', 'Soft 18 is too weak against a 9, 10 or ace. Hit.')
    }
    if (total === 17 && between(3, 6) && canDouble) return say('double', 'Soft 17 against a weak dealer: double.')
    if ((total === 15 || total === 16) && between(4, 6) && canDouble) return say('double', 'Double soft hands against a 4 to 6.')
    if ((total === 13 || total === 14) && between(5, 6) && canDouble) return say('double', 'Double soft hands against a 5 or 6.')
    return say('hit', 'You can’t bust a soft hand this low. Hit.')
  }

  if (canSurrender && ((total === 16 && up >= 9) || (total === 15 && up === 10))) {
    return say('surrender', `A hard ${total} against a strong dealer loses more often than half the time. Surrender saves half your bet.`)
  }
  if (total >= 17) return say('stand', `${total} is a made hand. Stand.`)
  if (total >= 13) {
    return up <= 6
      ? say('stand', 'The dealer is weak and may bust. Stand.')
      : say('hit', 'The dealer is strong. You must try to improve.')
  }
  if (total === 12) {
    return between(4, 6)
      ? say('stand', 'The dealer is likely to bust. Stand on 12.')
      : say('hit', '12 loses to most dealer hands. Hit.')
  }
  if (total === 11 && up !== 11 && canDouble) return say('double', '11 is the best doubling hand.')
  if (total === 10 && up <= 9 && canDouble) return say('double', 'Double 10 against anything but a 10 or ace.')
  if (total === 9 && between(3, 6) && canDouble) return say('double', 'Double 9 while the dealer is weak.')
  return say('hit', `${total} is too low to stand. Hit.`)
}
