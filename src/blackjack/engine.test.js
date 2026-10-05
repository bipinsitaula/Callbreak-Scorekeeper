import { describe, expect, it } from 'vitest'
import {
  basicStrategy,
  buildShoe,
  canSplitCards,
  createShoe,
  handValue,
  isNatural,
  needsReshuffle,
  secureRandomInt,
  settleHand,
  shuffle,
} from './engine'

const c = (rank, suit = 'spades') => ({ id: `${rank}-${suit}-${Math.random()}`, rank, suit })
const hand = (...ranks) => ranks.map((r) => c(r))

describe('handValue', () => {
  it('counts an ace as 11 until that would bust', () => {
    expect(handValue(hand('A', 'K'))).toEqual({ total: 21, soft: true })
    expect(handValue(hand('A', '6'))).toEqual({ total: 17, soft: true })
    expect(handValue(hand('A', '6', '10'))).toEqual({ total: 17, soft: false })
    expect(handValue(hand('A', 'A', '9'))).toEqual({ total: 21, soft: true })
    expect(handValue(hand('K', 'Q', '5'))).toEqual({ total: 25, soft: false })
  })

  it('treats only a two-card 21 as a natural', () => {
    expect(isNatural(hand('A', 'K'))).toBe(true)
    expect(isNatural(hand('7', '7', '7'))).toBe(false)
  })

  it('lets any two ten-value cards split', () => {
    expect(canSplitCards(hand('K', 'Q'))).toBe(true)
    expect(canSplitCards(hand('8', '9'))).toBe(false)
  })
})

describe('shoe and shuffling', () => {
  it('builds six full decks', () => {
    const shoe = buildShoe(6)
    expect(shoe).toHaveLength(312)
    expect(new Set(shoe.map((x) => x.id)).size).toBe(312)
  })

  it('shuffles into a permutation of the same cards', () => {
    const before = buildShoe(1)
    const after = shuffle(before)
    expect(after).not.toBe(before)
    expect([...after].map((x) => x.id).sort()).toEqual(before.map((x) => x.id).sort())
  })

  it('does not leave cards in their original order', () => {
    const sorted = buildShoe(1)
    expect(createShoe(1).map((x) => x.id)).not.toEqual(sorted.map((x) => x.id))
  })

  it('draws every card position with equal probability', () => {
    const deck = buildShoe(1)
    const counts = new Map()
    const trials = 10400 // expect 200 per card, sd about 14
    for (let i = 0; i < trials; i++) {
      const top = shuffle(deck)[0].id
      counts.set(top, (counts.get(top) ?? 0) + 1)
    }
    expect(counts.size).toBe(52)
    for (const n of counts.values()) {
      expect(n).toBeGreaterThan(130)
      expect(n).toBeLessThan(270)
    }
  })

  it('secureRandomInt stays in range and is unbiased', () => {
    const buckets = [0, 0, 0]
    for (let i = 0; i < 30000; i++) {
      const n = secureRandomInt(3)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(3)
      buckets[n]++
    }
    buckets.forEach((b) => {
      expect(b).toBeGreaterThan(9500)
      expect(b).toBeLessThan(10500)
    })
  })

  it('asks for a reshuffle when the shoe runs low', () => {
    expect(needsReshuffle(312)).toBe(false)
    expect(needsReshuffle(77)).toBe(true)
  })
})

describe('settleHand', () => {
  const player = (ranks, extra = {}) => ({ cards: hand(...ranks), bet: 100, ...extra })

  it('pays 3:2 on a natural blackjack', () => {
    expect(settleHand(player(['A', 'K']), hand('10', '9'))).toEqual({ outcome: 'blackjack', payout: 250 })
  })

  it('pushes when both have a natural', () => {
    expect(settleHand(player(['A', 'K']), hand('A', 'Q'))).toEqual({ outcome: 'push', payout: 100 })
  })

  it('does not pay 3:2 for 21 made after a split', () => {
    expect(settleHand(player(['A', 'K'], { fromSplit: true }), hand('10', '9'))).toEqual({ outcome: 'win', payout: 200 })
  })

  it('loses a bust even if the dealer busts too', () => {
    expect(settleHand(player(['K', 'Q', '5']), hand('K', '6', '9')).outcome).toBe('bust')
  })

  it('returns half the stake on surrender', () => {
    expect(settleHand(player(['10', '6'], { surrendered: true }), hand('10', '9'))).toEqual({ outcome: 'surrender', payout: 50 })
  })

  it('wins when the dealer busts, loses to a higher hand, pushes on a tie', () => {
    expect(settleHand(player(['10', '2']), hand('K', '6', '9')).payout).toBe(200)
    expect(settleHand(player(['10', '8']), hand('10', '9')).outcome).toBe('lose')
    expect(settleHand(player(['10', '9']), hand('10', '9')).outcome).toBe('push')
  })
})

describe('basicStrategy', () => {
  const ask = (ranks, up, opts = { canDouble: true, canSplit: true }) => basicStrategy(hand(...ranks), c(up), opts).action

  it('follows the well-known cases', () => {
    expect(ask(['10', '6'], '10')).toBe('hit')
    expect(ask(['10', '6'], '6')).toBe('stand')
    expect(ask(['6', '5'], '6')).toBe('double')
    expect(ask(['A', 'A'], '10')).toBe('split')
    expect(ask(['8', '8'], '10')).toBe('split')
    expect(ask(['10', 'K'], '6')).toBe('stand')
    expect(ask(['A', '7'], '9')).toBe('hit')
    expect(ask(['A', '7'], '5')).toBe('double')
    expect(ask(['9', '9'], '7')).toBe('stand')
    expect(ask(['5', '5'], '6')).toBe('double') // played as hard 10
  })

  it('recommends surrender for hard 16 against a 10, only when allowed', () => {
    const sur = { canDouble: false, canSplit: false, canSurrender: true }
    expect(ask(['10', '6'], '10', sur)).toBe('surrender')
    expect(ask(['10', '5'], '10', sur)).toBe('surrender')
    expect(ask(['10', '6'], '6', sur)).toBe('stand')
    expect(ask(['10', '6'], '10', { canDouble: false, canSplit: false })).toBe('hit')
    expect(ask(['8', '8'], '10', { canDouble: true, canSplit: true, canSurrender: true })).toBe('split')
  })

  it('falls back to a legal action when doubling is not allowed', () => {
    expect(ask(['6', '5'], '6', { canDouble: false, canSplit: false })).toBe('hit')
    expect(ask(['A', '7'], '5', { canDouble: false, canSplit: false })).toBe('stand')
  })
})
